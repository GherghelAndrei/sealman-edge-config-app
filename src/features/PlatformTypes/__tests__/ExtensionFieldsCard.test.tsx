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

// cmdk and Radix Popover use browser APIs that jsdom does not have.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;
Element.prototype.scrollIntoView ??= () => {};

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

const otherFieldSet: ExtensionFieldSet = {
  extension: "warranty",
  enabled: true,
  fields: {
    warranty_end: { type: "string", label: "Warranty end", required: false, changeable: true, show_in_list: false },
  },
  applied: { warranty_end: [] },
};

function renderCard(
  onApply = vi.fn().mockResolvedValue({ applied: [], skipped: [] }),
  fieldSets: ExtensionFieldSet[] = [fieldSet],
) {
  render(<ExtensionFieldsCard fieldSets={fieldSets} endpointTypes={endpointTypes} onApply={onApply} />);
  return onApply;
}

function rowToggle(extension: string) {
  return screen.getByRole("button", { name: new RegExp(`^${extension}\\b`) });
}

async function renderExpanded() {
  renderCard();
  await userEvent.click(rowToggle("inventory"));
}

describe("ExtensionFieldsCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders one "Additional fields" card with a row per extension', () => {
    renderCard(undefined, [fieldSet, otherFieldSet]);
    expect(screen.getAllByRole("heading", { name: "Additional fields" })).toHaveLength(1);
    expect(screen.getByText("Fields that extensions add to endpoint types.")).toBeInTheDocument();
    expect(rowToggle("inventory")).toBeInTheDocument();
    expect(rowToggle("warranty")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Apply to all types" })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: "Choose types" })).toHaveLength(2);
  });

  it("starts with every row collapsed, so no fields table is shown", () => {
    renderCard(undefined, [fieldSet, otherFieldSet]);
    expect(rowToggle("inventory")).toHaveAttribute("aria-expanded", "false");
    expect(rowToggle("warranty")).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("shows the field count and the number of distinct types the extension is applied to", () => {
    renderCard(undefined, [
      { ...fieldSet, applied: { serial_number: ["t-plc", "t-hmi"], asset_tag: ["t-plc"] } },
      otherFieldSet,
    ]);
    const inventory = rowToggle("inventory");
    expect(within(inventory).getByText("2 field(s)")).toBeInTheDocument();
    expect(within(inventory).getByText("applied to 2 type(s)")).toBeInTheDocument();
    const warranty = rowToggle("warranty");
    expect(within(warranty).getByText("1 field(s)")).toBeInTheDocument();
    expect(within(warranty).getByText("not applied yet")).toBeInTheDocument();
  });

  it("expands and collapses a row when its toggle is clicked", async () => {
    renderCard(undefined, [fieldSet, otherFieldSet]);
    await userEvent.click(rowToggle("inventory"));
    expect(rowToggle("inventory")).toHaveAttribute("aria-expanded", "true");
    expect(screen.getAllByRole("table")).toHaveLength(1);
    expect(screen.getByRole("row", { name: /serial_number/ })).toBeInTheDocument();
    expect(screen.queryByRole("row", { name: /warranty_end/ })).not.toBeInTheDocument();
    await userEvent.click(rowToggle("inventory"));
    expect(rowToggle("inventory")).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("clicking a row's action button opens the dialog for that extension without toggling the row", async () => {
    const onApply = renderCard(undefined, [fieldSet, otherFieldSet]);
    await userEvent.click(screen.getAllByRole("button", { name: "Apply to all types" })[1]);
    const dialog = screen.getByRole("alertdialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "Apply" }));
    expect(onApply).toHaveBeenCalledWith("warranty", {
      type_ids: expect.arrayContaining(["t-plc", "t-hmi", "t-cam"]),
      keys: ["warranty_end"],
    });
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(rowToggle("warranty")).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("lists each field with label, key and data type, and the labels of the types it is applied to", async () => {
    await renderExpanded();
    const row = screen.getByRole("row", { name: /serial_number/ });
    expect(within(row).getByText("Serial number")).toBeInTheDocument();
    expect(within(row).getByText("serial_number")).toBeInTheDocument();
    expect(within(row).getByText("string")).toBeInTheDocument();
    expect(within(row).getByText("PLC, HMI")).toBeInTheDocument();
  });

  it('shows "not applied yet" for a field with no types', async () => {
    await renderExpanded();
    const row = screen.getByRole("row", { name: /asset_tag/ });
    expect(within(row).getByText("integer")).toBeInTheDocument();
    expect(within(row).getByText("not applied yet")).toBeInTheDocument();
  });

  it("Apply to all types asks for confirmation naming the field count and the type labels", async () => {
    renderCard();
    await userEvent.click(screen.getByRole("button", { name: "Apply to all types" }));
    const dialog = screen.getByRole("alertdialog");
    expect(within(dialog).getByText('Apply "inventory" to all endpoint types?')).toBeInTheDocument();
    expect(
      within(dialog).getByText(
        "All 2 fields are added to Camera, HMI, PLC. Types that already have a field with the same key keep their own.",
      ),
    ).toBeInTheDocument();
    expect(within(dialog).queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("Cancel on the confirmation sends nothing and closes it", async () => {
    const onApply = renderCard();
    await userEvent.click(screen.getByRole("button", { name: "Apply to all types" }));
    await userEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Cancel" }));
    expect(onApply).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("Apply on the confirmation sends every endpoint type and every declared key", async () => {
    const onApply = renderCard();
    await userEvent.click(screen.getByRole("button", { name: "Apply to all types" }));
    await userEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Apply" }));
    expect(onApply).toHaveBeenCalledTimes(1);
    const [extension, body] = onApply.mock.calls[0];
    expect(extension).toBe("inventory");
    expect([...body.type_ids].sort()).toEqual(["t-cam", "t-hmi", "t-plc"]);
    expect([...body.keys].sort()).toEqual(["asset_tag", "serial_number"]);
  });

  it("disables both apply buttons when there are no endpoint types", () => {
    render(<ExtensionFieldsCard fieldSets={[fieldSet]} endpointTypes={[]} onApply={vi.fn()} />);
    for (const name of ["Apply to all types", "Choose types"]) {
      const button = screen.getByRole("button", { name });
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute("title", "No endpoint types defined");
    }
  });

  it("uses the singular for an extension with one field", async () => {
    renderCard(undefined, [otherFieldSet]);
    await userEvent.click(screen.getByRole("button", { name: "Apply to all types" }));
    expect(
      within(screen.getByRole("alertdialog")).getByText(
        "The 1 field is added to Camera, HMI, PLC. Types that already have a field with the same key keep their own.",
      ),
    ).toBeInTheDocument();
    await userEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Cancel" }));
    await userEvent.click(screen.getByRole("button", { name: "Choose types" }));
    expect(within(screen.getByRole("dialog")).getByText("The 1 field of warranty is added.")).toBeInTheDocument();
  });

  describe("Choose types", () => {
    // PLC has both fields (fully applied), HMI only one (partial), Camera none.
    const partlyApplied: ExtensionFieldSet = {
      ...fieldSet,
      applied: { serial_number: ["t-plc", "t-hmi"], asset_tag: ["t-plc"] },
    };

    async function openChooseTypes(onApply = vi.fn().mockResolvedValue({ applied: [], skipped: [] })) {
      renderCard(onApply, [partlyApplied]);
      await userEvent.click(screen.getByRole("button", { name: "Choose types" }));
      const dialog = screen.getByRole("dialog");
      return { onApply, dialog };
    }

    async function openPicker(dialog: HTMLElement) {
      await userEvent.click(within(dialog).getByRole("combobox"));
    }

    it("shows the title and the field count, and no field checkboxes", async () => {
      const { dialog } = await openChooseTypes();
      expect(within(dialog).getByText('Apply "inventory" to endpoint types')).toBeInTheDocument();
      expect(within(dialog).getByText("All 2 fields of inventory are added.")).toBeInTheDocument();
      expect(within(dialog).queryByRole("checkbox")).not.toBeInTheDocument();
      expect(within(dialog).queryByText(/Serial number/)).not.toBeInTheDocument();
    });

    it("disables Apply until a type is selected", async () => {
      const { dialog } = await openChooseTypes();
      expect(within(dialog).getByRole("button", { name: "Apply" })).toBeDisabled();
    });

    it("filters the type list by the search text", async () => {
      const { dialog } = await openChooseTypes();
      await openPicker(dialog);
      expect(screen.getAllByRole("option")).toHaveLength(3);
      await userEvent.type(screen.getByPlaceholderText("Search types..."), "cam");
      expect(screen.getAllByRole("option")).toHaveLength(1);
      expect(screen.getByRole("option", { name: /Camera/ })).toBeInTheDocument();
    });

    it("lists fully applied types as disabled with \"already applied\" and partially applied ones as selectable", async () => {
      const { dialog } = await openChooseTypes();
      await openPicker(dialog);
      const plc = screen.getByRole("option", { name: /PLC/ });
      expect(plc).toHaveAttribute("aria-disabled", "true");
      expect(within(plc).getByText("already applied")).toBeInTheDocument();
      const hmi = screen.getByRole("option", { name: /HMI/ });
      expect(hmi).toHaveAttribute("aria-disabled", "false");
      expect(within(hmi).queryByText("already applied")).not.toBeInTheDocument();

      await userEvent.click(plc);
      expect(within(dialog).queryByRole("button", { name: "Remove PLC" })).not.toBeInTheDocument();
      await userEvent.click(hmi);
      expect(within(dialog).getByRole("button", { name: "Remove HMI" })).toBeInTheDocument();
    });

    it("adds a chip per selected type and removes it with its x button", async () => {
      const { dialog } = await openChooseTypes();
      await openPicker(dialog);
      await userEvent.click(screen.getByRole("option", { name: /Camera/ }));
      expect(within(dialog).getByText("Camera")).toBeInTheDocument();
      const apply = within(dialog).getByRole("button", { name: "Apply" });
      expect(apply).toBeEnabled();

      await userEvent.click(within(dialog).getByRole("button", { name: "Remove Camera" }));
      expect(within(dialog).queryByRole("button", { name: "Remove Camera" })).not.toBeInTheDocument();
      expect(apply).toBeDisabled();
    });

    it("sends the selected type ids and every declared key", async () => {
      const { onApply, dialog } = await openChooseTypes();
      await openPicker(dialog);
      await userEvent.click(screen.getByRole("option", { name: /Camera/ }));
      await userEvent.click(screen.getByRole("option", { name: /HMI/ }));
      await userEvent.keyboard("{Escape}");
      await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Apply" }));
      expect(onApply).toHaveBeenCalledTimes(1);
      const [extension, body] = onApply.mock.calls[0];
      expect(extension).toBe("inventory");
      expect([...body.type_ids].sort()).toEqual(["t-cam", "t-hmi"]);
      expect([...body.keys].sort()).toEqual(["asset_tag", "serial_number"]);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("toasts the API error and keeps the dialog open when applying fails", async () => {
      const { dialog } = await openChooseTypes(vi.fn().mockRejectedValue(new ApiError("Unknown endpoint type", 404)));
      await openPicker(dialog);
      await userEvent.click(screen.getByRole("option", { name: /Camera/ }));
      await userEvent.keyboard("{Escape}");
      await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Apply" }));
      expect(toast.error).toHaveBeenCalledWith("Unknown endpoint type");
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(within(screen.getByRole("dialog")).getByRole("button", { name: "Remove Camera" })).toBeInTheDocument();
    });
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
    await userEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Apply" }));
    expect(toast.success).toHaveBeenCalledWith("Applied 2 field(s)");
    expect(toast.warning).toHaveBeenCalledWith("Skipped 1: PLC: serial_number (key already exists)");
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("does not warn when nothing is skipped", async () => {
    const onApply = vi.fn().mockResolvedValue({ applied: [{ type_id: "t-cam", key: "asset_tag" }], skipped: [] });
    renderCard(onApply);
    await userEvent.click(screen.getByRole("button", { name: "Apply to all types" }));
    await userEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Apply" }));
    expect(toast.success).toHaveBeenCalledWith("Applied 1 field(s)");
    expect(toast.warning).not.toHaveBeenCalled();
  });

  it("toasts the API error and keeps the dialog open when applying fails", async () => {
    const onApply = vi.fn().mockRejectedValue(new ApiError("Extension 'inventory' is disabled; enable it to apply its fields", 409));
    renderCard(onApply);
    await userEvent.click(screen.getByRole("button", { name: "Apply to all types" }));
    await userEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Apply" }));
    expect(toast.error).toHaveBeenCalledWith("Extension 'inventory' is disabled; enable it to apply its fields");
    expect(toast.success).not.toHaveBeenCalled();
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });
});
