import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "react-toastify";
import ExtensionFieldsCard from "../ExtensionFieldsCard";
import { ApiError } from "@/generated/edge-administration/api";
import type { TypeRecord } from "../TypeFormDialog";
import type { ExtensionFieldSet } from "@/generated/edge-administration/hooks/extension_fields/useGetExtensionFields";

vi.mock("react-toastify", () => ({
  toast: {
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
  },
}));

const fieldSet: ExtensionFieldSet = {
  extension: "inventory",
  enabled: true,
  fields: {
    serial_number: { type: "string", label: "Serial number", required: false, changeable: true, show_in_list: false },
    asset_tag: { type: "integer", label: "Asset tag", required: false, changeable: true, show_in_list: false },
  },
  applied: {
    serial_number: ["t-plc", "t-hmi"],
    asset_tag: [],
  },
};

const endpointTypes: TypeRecord[] = [
  { type_id: "t-plc", label: "PLC", description: null, fields: {} },
  { type_id: "t-hmi", label: "HMI", description: null, fields: {} },
  { type_id: "t-cam", label: "Camera", description: null, fields: {} },
];

function renderCard(onApply = vi.fn().mockResolvedValue({ applied: [], skipped: [] })) {
  render(<ExtensionFieldsCard fieldSet={fieldSet} endpointTypes={endpointTypes} onApply={onApply} />);
  return onApply;
}

function checkbox(dialog: HTMLElement, name: string) {
  return within(dialog).getByRole("checkbox", { name }) as HTMLInputElement;
}

describe("ExtensionFieldsCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists each field with label, key and data type, and the labels of the types it is applied to", () => {
    renderCard();
    const row = screen.getByRole("row", { name: /serial_number/ });
    expect(within(row).getByText("Serial number")).toBeInTheDocument();
    expect(within(row).getByText("serial_number")).toBeInTheDocument();
    expect(within(row).getByText("string")).toBeInTheDocument();
    expect(within(row).getByText("PLC, HMI")).toBeInTheDocument();
  });

  it('shows "not applied yet" for a field with no types', () => {
    renderCard();
    const row = screen.getByRole("row", { name: /asset_tag/ });
    expect(within(row).getByText("integer")).toBeInTheDocument();
    expect(within(row).getByText("not applied yet")).toBeInTheDocument();
  });

  it("Apply to all types pre-checks every type and every field and sends them", async () => {
    const onApply = renderCard();
    await userEvent.click(screen.getByRole("button", { name: "Apply to all types" }));
    const dialog = screen.getByRole("dialog");
    for (const name of ["PLC", "HMI", "Camera", "Serial number (serial_number)", "Asset tag (asset_tag)"]) {
      expect(checkbox(dialog, name).checked).toBe(true);
    }
    await userEvent.click(within(dialog).getByRole("button", { name: "Apply" }));
    expect(onApply).toHaveBeenCalledTimes(1);
    const [extension, body] = onApply.mock.calls[0];
    expect(extension).toBe("inventory");
    expect([...body.type_ids].sort()).toEqual(["t-cam", "t-hmi", "t-plc"]);
    expect([...body.keys].sort()).toEqual(["asset_tag", "serial_number"]);
  });

  it("Choose types pre-checks every field and no type", async () => {
    const onApply = renderCard();
    await userEvent.click(screen.getByRole("button", { name: "Choose types" }));
    const dialog = screen.getByRole("dialog");
    for (const name of ["PLC", "HMI", "Camera"]) {
      expect(checkbox(dialog, name).checked).toBe(false);
    }
    expect(checkbox(dialog, "Serial number (serial_number)").checked).toBe(true);
    expect(checkbox(dialog, "Asset tag (asset_tag)").checked).toBe(true);
    const apply = within(dialog).getByRole("button", { name: "Apply" });
    expect(apply).toBeDisabled();

    await userEvent.click(checkbox(dialog, "Camera"));
    expect(apply).toBeEnabled();
    await userEvent.click(apply);
    expect(onApply).toHaveBeenCalledWith("inventory", {
      type_ids: ["t-cam"],
      keys: expect.arrayContaining(["serial_number", "asset_tag"]),
    });
  });

  it("unchecking a field leaves it out of keys", async () => {
    const onApply = renderCard();
    await userEvent.click(screen.getByRole("button", { name: "Apply to all types" }));
    const dialog = screen.getByRole("dialog");
    await userEvent.click(checkbox(dialog, "Asset tag (asset_tag)"));
    await userEvent.click(within(dialog).getByRole("button", { name: "Apply" }));
    expect(onApply.mock.calls[0][1].keys).toEqual(["serial_number"]);
  });

  it("toasts the applied count and lists skipped key_exists items", async () => {
    const onApply = vi.fn().mockResolvedValue({
      applied: [
        { type_id: "t-cam", key: "serial_number" },
        { type_id: "t-cam", key: "asset_tag" },
      ],
      skipped: [{ type_id: "t-plc", key: "serial_number", reason: "key_exists" }],
    });
    renderCard(onApply);
    await userEvent.click(screen.getByRole("button", { name: "Apply to all types" }));
    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Apply" }));
    expect(toast.success).toHaveBeenCalledWith("Applied 2 field(s)");
    expect(toast.warning).toHaveBeenCalledWith("Skipped 1: PLC: serial_number (key already exists)");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("does not warn when nothing is skipped", async () => {
    const onApply = vi.fn().mockResolvedValue({ applied: [{ type_id: "t-cam", key: "asset_tag" }], skipped: [] });
    renderCard(onApply);
    await userEvent.click(screen.getByRole("button", { name: "Apply to all types" }));
    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Apply" }));
    expect(toast.success).toHaveBeenCalledWith("Applied 1 field(s)");
    expect(toast.warning).not.toHaveBeenCalled();
  });

  it("toasts the API error and keeps the dialog open when applying fails", async () => {
    const onApply = vi.fn().mockRejectedValue(new ApiError("Extension 'inventory' is disabled; enable it to apply its fields", 409));
    renderCard(onApply);
    await userEvent.click(screen.getByRole("button", { name: "Apply to all types" }));
    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Apply" }));
    expect(toast.error).toHaveBeenCalledWith("Extension 'inventory' is disabled; enable it to apply its fields");
    expect(toast.success).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
