import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TypesManager from "../TypesManager";
import type { ExtensionFieldSet } from "@/generated/edge-administration/hooks/extension_fields/useGetExtensionFields";
import { ENDPOINT_ROLE_OPTIONS, ENDPOINT_TYPE_DEFAULT_FIELDS, ENDPOINT_TYPE_DEFAULT_MAPPING } from "../typeRoles";

describe("TypesManager mapping", () => {
  it("sends mapping on create when roleOptions are set", async () => {
    const onCreate = vi.fn().mockResolvedValue(undefined);
    render(
      <TypesManager
        title="Endpoint Types"
        singularLabel="Endpoint Type"
        types={[]}
        isLoading={false}
        defaultFields={ENDPOINT_TYPE_DEFAULT_FIELDS}
        defaultMapping={ENDPOINT_TYPE_DEFAULT_MAPPING}
        roleOptions={ENDPOINT_ROLE_OPTIONS}
        onCreate={onCreate}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: "Add endpoint type" }));
    await userEvent.type(screen.getByPlaceholderText("Human readable name"), "PLC");
    const buttons = screen.getAllByRole("button", { name: "Add endpoint type" });
    await userEvent.click(buttons[buttons.length - 1]);
    expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({ mapping: { ip: "ip", name: "name" } }));
  });

  it("sends no mapping without roleOptions", async () => {
    const onCreate = vi.fn().mockResolvedValue(undefined);
    render(<TypesManager title="Device Types" singularLabel="Device Type" types={[]} isLoading={false} onCreate={onCreate} onUpdate={vi.fn()} onDelete={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Add device type" }));
    await userEvent.type(screen.getByPlaceholderText("Human readable name"), "Gateway");
    const buttons = screen.getAllByRole("button", { name: "Add device type" });
    await userEvent.click(buttons[buttons.length - 1]);
    expect(onCreate.mock.calls[0][0]).not.toHaveProperty("mapping");
  });
});

const inventoryFieldSet: ExtensionFieldSet = {
  extension: "inventory",
  enabled: true,
  fields: {
    serial_number: { type: "string", label: "Serial number", required: false, changeable: true, show_in_list: false },
  },
  applied: { serial_number: [] },
};

describe("TypesManager extension fields", () => {
  function renderEndpointManager(onCreate = vi.fn().mockResolvedValue(undefined)) {
    render(
      <TypesManager
        title="Endpoint Types"
        singularLabel="Endpoint Type"
        types={[]}
        isLoading={false}
        defaultFields={ENDPOINT_TYPE_DEFAULT_FIELDS}
        defaultMapping={ENDPOINT_TYPE_DEFAULT_MAPPING}
        roleOptions={ENDPOINT_ROLE_OPTIONS}
        extensionFieldSets={[inventoryFieldSet]}
        onCreate={onCreate}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    return onCreate;
  }

  async function submitCreate(tick: boolean) {
    await userEvent.click(screen.getByRole("button", { name: "Add endpoint type" }));
    await userEvent.type(screen.getByPlaceholderText("Human readable name"), "PLC");
    if (tick) await userEvent.click(screen.getByLabelText("Serial number (serial_number)"));
    const buttons = screen.getAllByRole("button", { name: "Add endpoint type" });
    await userEvent.click(buttons[buttons.length - 1]);
  }

  it("TypesManager forwards extension_fields on create", async () => {
    const onCreate = renderEndpointManager();
    await submitCreate(true);
    expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({ extension_fields: { inventory: ["serial_number"] } }));
  });

  it("sends no extension_fields on create when nothing is ticked", async () => {
    const onCreate = renderEndpointManager();
    await submitCreate(false);
    expect(onCreate.mock.calls[0][0]).not.toHaveProperty("extension_fields");
  });
});
