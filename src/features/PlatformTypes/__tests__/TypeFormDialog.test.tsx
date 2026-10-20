import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TypeFormDialog, { TypeRecord } from "../TypeFormDialog";
import ExtensionFieldsPicker from "../ExtensionFieldsPicker";
import { filterOfferedSelection } from "../extensionFieldsOffer";
import type { ExtensionFieldSet } from "@/generated/edge-administration/hooks/extension_fields/useGetExtensionFields";
import type { FieldDefinition } from "../FieldsEditor";
import {
  ENDPOINT_ROLE_OPTIONS,
  ENDPOINT_TYPE_DEFAULT_FIELDS,
  ENDPOINT_TYPE_DEFAULT_MAPPING,
  SERVICE_ROLE_OPTIONS,
  SERVICE_TYPE_DEFAULT_FIELDS,
  SERVICE_TYPE_DEFAULT_MAPPING,
} from "../typeRoles";

function stringField(label: string, required = false): FieldDefinition {
  return { type: "string", label, required, ui: "input", default: null, changeable: true, show_in_list: true };
}

function renderEndpointCreate() {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  render(
    <TypeFormDialog
      isOpen
      onClose={() => {}}
      onSubmit={onSubmit}
      singularLabel="Endpoint Type"
      defaultFields={ENDPOINT_TYPE_DEFAULT_FIELDS}
      defaultMapping={ENDPOINT_TYPE_DEFAULT_MAPPING}
      roleOptions={ENDPOINT_ROLE_OPTIONS}
      supportsListVisibility
    />
  );
  return onSubmit;
}

describe("TypeFormDialog roles", () => {
  it("pre-fills ip and name with their roles on create", () => {
    renderEndpointCreate();
    expect(screen.getByLabelText("Role of field ip")).toHaveValue("ip");
    expect(screen.getByLabelText("Role of field name")).toHaveValue("name");
  });

  it("sends the pre-filled fields as optional and their roles as mapping", async () => {
    const onSubmit = renderEndpointCreate();
    await userEvent.type(screen.getByPlaceholderText("Human readable name"), "PLC");
    await userEvent.click(screen.getByRole("button", { name: "Add endpoint type" }));
    const result = onSubmit.mock.calls[0][0];
    expect(result.mapping).toEqual({ ip: "ip", name: "name" });
    expect(result.fields.ip).toMatchObject({ type: "string", required: false });
    expect(result.fields.name).toMatchObject({ type: "string", required: false });
  });

  it("drops a removed pre-filled field from fields and mapping", async () => {
    const onSubmit = renderEndpointCreate();
    await userEvent.type(screen.getByPlaceholderText("Human readable name"), "PLC");
    await userEvent.click(screen.getAllByRole("button", { name: "Remove field" })[0]);
    await userEvent.click(screen.getByRole("button", { name: "Add endpoint type" }));
    const result = onSubmit.mock.calls[0][0];
    expect(result.fields).not.toHaveProperty("ip");
    expect(result.mapping).toEqual({ name: "name" });
  });

  it("pre-fills a service type with an optional 0-65535 port field and the port role", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <TypeFormDialog
        isOpen
        onClose={() => {}}
        onSubmit={onSubmit}
        singularLabel="Service Type"
        defaultFields={SERVICE_TYPE_DEFAULT_FIELDS}
        defaultMapping={SERVICE_TYPE_DEFAULT_MAPPING}
        roleOptions={SERVICE_ROLE_OPTIONS}
      />
    );
    await userEvent.type(screen.getByPlaceholderText("Human readable name"), "Modbus");
    await userEvent.click(screen.getByRole("button", { name: "Add service type" }));
    const result = onSubmit.mock.calls[0][0];
    expect(result.fields.port).toMatchObject({ type: "integer", required: false, validation: { minimum: 0, maximum: 65535 } });
    expect(result.mapping).toEqual({ port: "port" });
  });

  it("edits a legacy type: shows its stored roles and sends them back", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const legacy: TypeRecord = {
      type_id: "t1",
      label: "Legacy",
      description: null,
      fields: { ip: stringField("IP Address", true), name: stringField("Name", true) },
      mapping: { ip: "ip" },
    };
    render(
      <TypeFormDialog isOpen onClose={() => {}} onSubmit={onSubmit} initial={legacy} singularLabel="Endpoint Type" roleOptions={ENDPOINT_ROLE_OPTIONS} />
    );
    expect(screen.getByLabelText("Role of field ip")).toHaveValue("ip");
    expect(screen.getByLabelText("Role of field name")).toHaveValue("");
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(onSubmit.mock.calls[0][0].mapping).toEqual({ ip: "ip" });
  });

  it("sends a role chosen while editing", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const record: TypeRecord = { type_id: "t1", label: "T", description: null, fields: { title: stringField("Title") }, mapping: {} };
    render(<TypeFormDialog isOpen onClose={() => {}} onSubmit={onSubmit} initial={record} singularLabel="Endpoint Type" roleOptions={ENDPOINT_ROLE_OPTIONS} />);
    await userEvent.selectOptions(screen.getByLabelText("Role of field title"), "name");
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(onSubmit.mock.calls[0][0].mapping).toEqual({ title: "name" });
  });

  it("edit with a managed field sends its definition back unchanged except a new label", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const managed: FieldDefinition = {
      type: "string",
      label: "Serial",
      description: "From the inventory",
      required: false,
      ui: "select",
      options: ["A100", "B200"],
      validation: { pattern: "^[A-Z]\\d{3}$", min_length: 4, max_length: 4, minimum: null, maximum: null, multiple_of: null, exclusive_minimum: false, exclusive_maximum: false },
      default: "A100",
      changeable: false,
      show_in_list: true,
    };
    const record: TypeRecord = {
      type_id: "t1",
      label: "T",
      description: null,
      fields: { ip: stringField("IP"), serial_number: managed },
      mapping: { ip: "ip" },
      managed_by: { serial_number: "inventory" },
    };
    render(<TypeFormDialog isOpen onClose={() => {}} onSubmit={onSubmit} initial={record} singularLabel="Endpoint Type" roleOptions={ENDPOINT_ROLE_OPTIONS} />);
    const labelInput = screen.getByDisplayValue("Serial");
    await userEvent.clear(labelInput);
    await userEvent.type(labelInput, "Serial number");
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    const result = onSubmit.mock.calls[0][0];
    expect(result.fields.serial_number).toEqual({ ...managed, label: "Serial number" });
    expect(result.mapping).toEqual({ ip: "ip" });
    expect(result.mapping).not.toHaveProperty("serial_number");
  });

  it.each(["Endpoint Type", "Service Type", "Device Type"])("edit of a %s sends an empty type description when one is cleared", async (singularLabel) => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const record: TypeRecord = { type_id: "t1", label: "T", description: "Old text", fields: {}, mapping: {} };
    render(<TypeFormDialog isOpen onClose={() => {}} onSubmit={onSubmit} initial={record} singularLabel={singularLabel} />);
    const input = screen.getByPlaceholderText("Optional description");
    await userEvent.clear(input);
    expect(input).toHaveValue("");
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(onSubmit.mock.calls[0][0].description).toBe("");
  });

  it("edit sends a null type description when it never had one, even after typing and erasing", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const record: TypeRecord = { type_id: "t1", label: "T", description: null, fields: {}, mapping: {} };
    render(<TypeFormDialog isOpen onClose={() => {}} onSubmit={onSubmit} initial={record} singularLabel="Endpoint Type" />);
    const input = screen.getByPlaceholderText("Optional description");
    await userEvent.type(input, "x");
    await userEvent.clear(input);
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(onSubmit.mock.calls[0][0].description).toBeNull();
  });

  it("create sends a null type description when it is left empty", async () => {
    const onSubmit = renderEndpointCreate();
    await userEvent.type(screen.getByPlaceholderText("Human readable name"), "PLC");
    await userEvent.type(screen.getByPlaceholderText("Optional description"), "   ");
    await userEvent.click(screen.getByRole("button", { name: "Add endpoint type" }));
    expect(onSubmit.mock.calls[0][0].description).toBeNull();
  });

  it("edit sends a trimmed type description when it is changed", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const record: TypeRecord = { type_id: "t1", label: "T", description: "Old", fields: {}, mapping: {} };
    render(<TypeFormDialog isOpen onClose={() => {}} onSubmit={onSubmit} initial={record} singularLabel="Endpoint Type" />);
    const input = screen.getByPlaceholderText("Optional description");
    await userEvent.clear(input);
    await userEvent.type(input, " New ");
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(onSubmit.mock.calls[0][0].description).toBe("New");
  });

  it("edit sends an empty description for a cleared description so the stored one is cleared", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const record: TypeRecord = {
      type_id: "t1",
      label: "T",
      description: null,
      fields: { addr: { ...stringField("Address"), description: "Where to reach it" }, note: stringField("Note") },
      mapping: {},
    };
    render(<TypeFormDialog isOpen onClose={() => {}} onSubmit={onSubmit} initial={record} singularLabel="Service Type" />);
    const descriptionInput = screen.getByDisplayValue("Where to reach it");
    await userEvent.clear(descriptionInput);
    expect(descriptionInput).toHaveValue("");
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    const result = onSubmit.mock.calls[0][0];
    expect(result.fields.addr.description).toBe("");
    expect(result.fields.note.description ?? null).toBeNull();
  });

  it("edit does not send an empty description for a field that never had one, even after typing and erasing", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const record: TypeRecord = { type_id: "t1", label: "T", description: null, fields: { note: stringField("Note") }, mapping: {} };
    render(<TypeFormDialog isOpen onClose={() => {}} onSubmit={onSubmit} initial={record} singularLabel="Device Type" />);
    const descriptionInput = screen.getByPlaceholderText("Optional help text");
    await userEvent.type(descriptionInput, "x");
    await userEvent.clear(descriptionInput);
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(onSubmit.mock.calls[0][0].fields.note.description ?? null).toBeNull();
  });

  it("edit with a managed field sends null for a removed managed field and no mapping entry for it", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const record: TypeRecord = {
      type_id: "t1",
      label: "T",
      description: null,
      fields: { ip: stringField("IP"), serial_number: stringField("Serial") },
      mapping: { ip: "ip" },
      managed_by: { serial_number: "inventory" },
    };
    render(<TypeFormDialog isOpen onClose={() => {}} onSubmit={onSubmit} initial={record} singularLabel="Endpoint Type" roleOptions={ENDPOINT_ROLE_OPTIONS} />);
    expect(screen.getByText("from inventory")).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole("button", { name: "Remove field" })[1]);
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    const result = onSubmit.mock.calls[0][0];
    expect(result.fields.serial_number).toBeNull();
    expect(result.fields.ip).toMatchObject({ label: "IP" });
    expect(result.mapping).toEqual({ ip: "ip" });
  });

  it("has no role selector and no mapping without roleOptions", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<TypeFormDialog isOpen onClose={() => {}} onSubmit={onSubmit} singularLabel="Device Type" defaultFields={{ serial: stringField("Serial") }} />);
    expect(screen.queryByLabelText("Role of field serial")).not.toBeInTheDocument();
    await userEvent.type(screen.getByPlaceholderText("Human readable name"), "Gateway");
    await userEvent.click(screen.getByRole("button", { name: "Add device type" }));
    expect(onSubmit.mock.calls[0][0].mapping).toBeNull();
  });
});

const inventoryFieldSet: ExtensionFieldSet = {
  extension: "inventory",
  enabled: true,
  fields: {
    serial_number: { type: "string", label: "Serial number", required: false, changeable: true, show_in_list: false },
    asset_tag: { type: "integer", label: "Asset tag", required: false, changeable: true, show_in_list: false },
  },
  applied: { serial_number: [], asset_tag: [] },
};

const monitoringFieldSet: ExtensionFieldSet = {
  extension: "monitoring",
  enabled: true,
  fields: {
    poll_interval: { type: "integer", label: "Poll interval", required: false, changeable: true, show_in_list: false },
  },
  applied: { poll_interval: [] },
};

function renderEndpointCreateWithExtensions(defaultFields: Record<string, FieldDefinition> = ENDPOINT_TYPE_DEFAULT_FIELDS) {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  render(
    <TypeFormDialog
      isOpen
      onClose={() => {}}
      onSubmit={onSubmit}
      singularLabel="Endpoint Type"
      defaultFields={defaultFields}
      defaultMapping={ENDPOINT_TYPE_DEFAULT_MAPPING}
      roleOptions={ENDPOINT_ROLE_OPTIONS}
      supportsListVisibility
      extensionFieldSets={[inventoryFieldSet, monitoringFieldSet]}
    />
  );
  return onSubmit;
}

function extensionCheckbox(name: string) {
  return screen.getByRole("checkbox", { name });
}

function showFieldsButton(extension: string) {
  return within(screen.getByRole("group", { name: extension })).getByRole("button", { name: `Show ${extension} fields` });
}

describe("TypeFormDialog extension fields on create", () => {
  it("create shows an Additional fields section with one unchecked, collapsed row per extension", () => {
    renderEndpointCreateWithExtensions();
    expect(screen.getByText("Additional fields")).toBeInTheDocument();
    expect(screen.queryByText("Extension fields")).not.toBeInTheDocument();
    expect(extensionCheckbox("inventory 2 field(s)")).not.toBeChecked();
    expect(extensionCheckbox("monitoring 1 field(s)")).not.toBeChecked();
    expect(showFieldsButton("inventory")).toHaveAttribute("aria-expanded", "false");
    expect(showFieldsButton("monitoring")).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText("serial_number")).not.toBeVisible();
    expect(screen.queryByRole("list", { name: "inventory fields" })).not.toBeInTheDocument();
    // No per-field checkboxes anymore.
    expect(screen.queryByRole("checkbox", { name: /serial_number/ })).not.toBeInTheDocument();
  });

  it("ticking an extension sends all its fields in declaration order", async () => {
    const onSubmit = renderEndpointCreateWithExtensions();
    await userEvent.type(screen.getByPlaceholderText("Human readable name"), "PLC");
    await userEvent.click(extensionCheckbox("inventory 2 field(s)"));
    await userEvent.click(screen.getByRole("button", { name: "Add endpoint type" }));
    expect(onSubmit.mock.calls[0][0].extension_fields).toEqual({ inventory: ["serial_number", "asset_tag"] });
  });

  it("omits an extension that was ticked and then unticked", async () => {
    const onSubmit = renderEndpointCreateWithExtensions();
    await userEvent.type(screen.getByPlaceholderText("Human readable name"), "PLC");
    await userEvent.click(extensionCheckbox("inventory 2 field(s)"));
    await userEvent.click(extensionCheckbox("monitoring 1 field(s)"));
    await userEvent.click(extensionCheckbox("inventory 2 field(s)"));
    await userEvent.click(screen.getByRole("button", { name: "Add endpoint type" }));
    expect(onSubmit.mock.calls[0][0].extension_fields).toEqual({ monitoring: ["poll_interval"] });
  });

  it("sends no extension_fields when nothing is ticked", async () => {
    const onSubmit = renderEndpointCreateWithExtensions();
    await userEvent.type(screen.getByPlaceholderText("Human readable name"), "PLC");
    await userEvent.click(screen.getByRole("button", { name: "Add endpoint type" }));
    expect(onSubmit.mock.calls[0][0]).not.toHaveProperty("extension_fields");
  });

  it("blocks save when a ticked extension's key is also a row key", async () => {
    const onSubmit = renderEndpointCreateWithExtensions({ ...ENDPOINT_TYPE_DEFAULT_FIELDS, serial_number: stringField("Serial") });
    await userEvent.type(screen.getByPlaceholderText("Human readable name"), "PLC");
    await userEvent.click(extensionCheckbox("inventory 2 field(s)"));
    await userEvent.click(screen.getByRole("button", { name: "Add endpoint type" }));
    expect(screen.getByText('Field "serial_number" is also selected as an extension field')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows no Additional fields section without field sets", () => {
    renderEndpointCreate();
    expect(screen.queryByText("Additional fields")).not.toBeInTheDocument();
  });
});

describe("ExtensionFieldsPicker", () => {
  it("Show fields expands a read-only list of the offered fields and collapses it again", async () => {
    render(<ExtensionFieldsPicker fieldSets={[inventoryFieldSet]} excludeKeys={new Set()} value={{}} onChange={() => {}} />);
    const toggle = showFieldsButton("inventory");
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    const list = screen.getByRole("list", { name: "inventory fields" });
    expect(within(list).getByText("Serial number")).toBeInTheDocument();
    expect(within(list).getByText("serial_number")).toBeInTheDocument();
    expect(within(list).getByText("Asset tag")).toBeInTheDocument();
    expect(within(list).getByText("asset_tag")).toBeInTheDocument();
    expect(within(list).queryByRole("checkbox")).not.toBeInTheDocument();
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("list", { name: "inventory fields" })).not.toBeInTheDocument();
    // The collapsed list stays in the DOM (hidden), so aria-controls always points at it.
    const controlled = document.getElementById(toggle.getAttribute("aria-controls")!);
    expect(controlled).not.toBeNull();
    expect(controlled).not.toBeVisible();
  });

  it("gives each Show fields toggle a distinct accessible name", () => {
    render(
      <ExtensionFieldsPicker fieldSets={[inventoryFieldSet, monitoringFieldSet]} excludeKeys={new Set()} value={{}} onChange={() => {}} />
    );
    expect(screen.getByRole("button", { name: "Show inventory fields" })).toHaveTextContent("Show fields");
    expect(screen.getByRole("button", { name: "Show monitoring fields" })).toHaveTextContent("Show fields");
  });

  it.each(["constructor", "__proto__", "toString"])(
    "handles an extension named %s like any other name",
    async (name) => {
      const fieldSet: ExtensionFieldSet = { ...monitoringFieldSet, extension: name };
      const onChange = vi.fn();
      const { rerender } = render(
        <ExtensionFieldsPicker fieldSets={[fieldSet]} excludeKeys={new Set()} value={{}} onChange={onChange} />
      );
      expect(extensionCheckbox(`${name} 1 field(s)`)).not.toBeChecked();
      await userEvent.click(extensionCheckbox(`${name} 1 field(s)`));
      const ticked = onChange.mock.lastCall![0];
      expect(Object.hasOwn(ticked, name)).toBe(true);
      expect(Object.entries(ticked)).toEqual([[name, ["poll_interval"]]]);
      rerender(<ExtensionFieldsPicker fieldSets={[fieldSet]} excludeKeys={new Set()} value={ticked} onChange={onChange} />);
      expect(extensionCheckbox(`${name} 1 field(s)`)).toBeChecked();
      await userEvent.click(extensionCheckbox(`${name} 1 field(s)`));
      expect(Object.entries(onChange.mock.lastCall![0])).toEqual([]);
    }
  );
});

describe("filterOfferedSelection", () => {
  it("keeps a ticked extension named __proto__ or constructor as an own key", () => {
    const sets = [
      { ...monitoringFieldSet, extension: "__proto__" },
      { ...inventoryFieldSet, extension: "constructor" },
    ];
    const selection = Object.fromEntries([
      ["__proto__", ["poll_interval"]],
      ["constructor", ["serial_number"]],
    ]);
    const result = filterOfferedSelection(selection, sets, new Set());
    expect(Object.entries(result)).toEqual([
      ["__proto__", ["poll_interval"]],
      ["constructor", ["serial_number", "asset_tag"]],
    ]);
  });

  it("counts and lists only the keys not excluded, and hides an extension left with none", async () => {
    render(
      <ExtensionFieldsPicker
        fieldSets={[inventoryFieldSet, monitoringFieldSet]}
        excludeKeys={new Set(["serial_number", "poll_interval"])}
        value={{}}
        onChange={() => {}}
      />
    );
    expect(extensionCheckbox("inventory 1 field(s)")).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "monitoring" })).not.toBeInTheDocument();
    await userEvent.click(showFieldsButton("inventory"));
    const list = screen.getByRole("list", { name: "inventory fields" });
    expect(within(list).queryByText("serial_number")).not.toBeInTheDocument();
    expect(within(list).getByText("asset_tag")).toBeInTheDocument();
  });

  it("does not list a disabled extension", () => {
    render(
      <ExtensionFieldsPicker
        fieldSets={[{ ...inventoryFieldSet, enabled: false }, monitoringFieldSet]}
        excludeKeys={new Set()}
        value={{}}
        onChange={() => {}}
      />
    );
    expect(screen.queryByRole("group", { name: "inventory" })).not.toBeInTheDocument();
    expect(screen.getByRole("group", { name: "monitoring" })).toBeInTheDocument();
  });

  it("renders nothing when no field is left to offer", () => {
    const { container } = render(
      <ExtensionFieldsPicker fieldSets={[monitoringFieldSet]} excludeKeys={new Set(["poll_interval"])} value={{}} onChange={() => {}} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("ticking reports all offered keys in declaration order, unticking drops the extension", async () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <ExtensionFieldsPicker
        fieldSets={[inventoryFieldSet, monitoringFieldSet]}
        excludeKeys={new Set(["serial_number"])}
        value={{ monitoring: ["poll_interval"] }}
        onChange={onChange}
      />
    );
    expect(extensionCheckbox("monitoring 1 field(s)")).toBeChecked();
    expect(extensionCheckbox("inventory 1 field(s)")).not.toBeChecked();
    await userEvent.click(extensionCheckbox("inventory 1 field(s)"));
    expect(onChange).toHaveBeenLastCalledWith({ monitoring: ["poll_interval"], inventory: ["asset_tag"] });
    rerender(
      <ExtensionFieldsPicker
        fieldSets={[inventoryFieldSet, monitoringFieldSet]}
        excludeKeys={new Set(["serial_number"])}
        value={{ monitoring: ["poll_interval"], inventory: ["asset_tag"] }}
        onChange={onChange}
      />
    );
    await userEvent.click(extensionCheckbox("monitoring 1 field(s)"));
    expect(onChange).toHaveBeenLastCalledWith({ inventory: ["asset_tag"] });
  });
});

const plcRecord: TypeRecord = {
  type_id: "t-plc",
  label: "PLC",
  description: null,
  fields: { ip: stringField("IP"), serial_number: stringField("Serial") },
  mapping: { ip: "ip" },
};

function renderEndpointEditWithExtensions(
  record: TypeRecord = plcRecord,
  fieldSets: ExtensionFieldSet[] = [inventoryFieldSet, monitoringFieldSet]
) {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  const props = {
    onClose: () => {},
    onSubmit,
    initial: record,
    singularLabel: "Endpoint Type",
    roleOptions: ENDPOINT_ROLE_OPTIONS,
    supportsListVisibility: true,
  };
  const view = render(<TypeFormDialog isOpen {...props} extensionFieldSets={fieldSets} />);
  return { onSubmit, view, props };
}

describe("TypeFormDialog extension fields on edit", () => {
  it("edit offers and counts only the fields the type doesn't have yet, unchecked and collapsed", async () => {
    renderEndpointEditWithExtensions();
    expect(screen.getByText("Additional fields")).toBeInTheDocument();
    expect(extensionCheckbox("inventory 1 field(s)")).not.toBeChecked();
    expect(extensionCheckbox("monitoring 1 field(s)")).not.toBeChecked();
    expect(showFieldsButton("inventory")).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(showFieldsButton("inventory"));
    const list = screen.getByRole("list", { name: "inventory fields" });
    expect(within(list).queryByText("serial_number")).not.toBeInTheDocument();
    expect(within(list).getByText("asset_tag")).toBeInTheDocument();
  });

  it("edit does not list an extension whose fields the type already has", () => {
    renderEndpointEditWithExtensions({ ...plcRecord, fields: { ...plcRecord.fields, poll_interval: stringField("Poll") } });
    expect(screen.queryByRole("group", { name: "monitoring" })).not.toBeInTheDocument();
    expect(screen.getByRole("group", { name: "inventory" })).toBeInTheDocument();
  });

  it("Save sends the field edits and the ticked extension's offered keys in one onSubmit result", async () => {
    const record: TypeRecord = { ...plcRecord, fields: { ip: stringField("Host") } };
    const { onSubmit } = renderEndpointEditWithExtensions(record);
    const labelInput = screen.getByDisplayValue("Host");
    await userEvent.clear(labelInput);
    await userEvent.type(labelInput, "Address");
    await userEvent.click(extensionCheckbox("inventory 2 field(s)"));
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    const result = onSubmit.mock.calls[0][0];
    expect(result.fields.ip).toMatchObject({ label: "Address" });
    expect(result.extension_fields).toEqual({ inventory: ["serial_number", "asset_tag"] });
  });

  it("edit sends only the missing keys of a ticked extension", async () => {
    const { onSubmit } = renderEndpointEditWithExtensions();
    await userEvent.click(extensionCheckbox("inventory 1 field(s)"));
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(onSubmit.mock.calls[0][0].extension_fields).toEqual({ inventory: ["asset_tag"] });
  });

  it("Save without ticks sends no extension_fields", async () => {
    const { onSubmit } = renderEndpointEditWithExtensions();
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(onSubmit.mock.calls[0][0]).not.toHaveProperty("extension_fields");
  });

  it("blocks save when a ticked extension's key is also a new row key", async () => {
    const { onSubmit } = renderEndpointEditWithExtensions();
    await userEvent.click(extensionCheckbox("monitoring 1 field(s)"));
    await userEvent.click(screen.getByRole("button", { name: "Add field" }));
    const keyInputs = screen.getAllByPlaceholderText("field_key");
    await userEvent.type(keyInputs[keyInputs.length - 1], "poll_interval");
    const labelInputs = screen.getAllByPlaceholderText("Human readable label");
    await userEvent.type(labelInputs[labelInputs.length - 1], "Poll");
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(screen.getByText('Field "poll_interval" is also selected as an extension field')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("resets the ticked extensions when the dialog is reopened", async () => {
    const { view, props } = renderEndpointEditWithExtensions();
    await userEvent.click(extensionCheckbox("inventory 1 field(s)"));
    view.rerender(<TypeFormDialog isOpen={false} {...props} extensionFieldSets={[inventoryFieldSet, monitoringFieldSet]} />);
    view.rerender(<TypeFormDialog isOpen {...props} extensionFieldSets={[inventoryFieldSet, monitoringFieldSet]} />);
    expect(extensionCheckbox("inventory 1 field(s)")).not.toBeChecked();
  });
});

describe("TypeFormDialog drops stale extension field ticks", () => {
  it("does not send a ticked extension that is no longer offered (edit)", async () => {
    const { onSubmit, view, props } = renderEndpointEditWithExtensions();
    await userEvent.click(extensionCheckbox("inventory 1 field(s)"));
    await userEvent.click(extensionCheckbox("monitoring 1 field(s)"));
    // A refetch while the dialog is open disables "inventory".
    view.rerender(<TypeFormDialog isOpen {...props} extensionFieldSets={[monitoringFieldSet]} />);
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(onSubmit.mock.calls[0][0].extension_fields).toEqual({ monitoring: ["poll_interval"] });
  });

  it("a ticked extension's keys follow the fields offered now", async () => {
    const { onSubmit, view, props } = renderEndpointEditWithExtensions({ ...plcRecord, fields: { ip: stringField("IP") } });
    await userEvent.click(extensionCheckbox("inventory 2 field(s)"));
    // A refetch while the dialog is open: the manifest dropped asset_tag and added location.
    const refetched: ExtensionFieldSet = {
      ...inventoryFieldSet,
      fields: {
        serial_number: inventoryFieldSet.fields.serial_number,
        location: { type: "string", label: "Location", required: false, changeable: true, show_in_list: false },
      },
      applied: { serial_number: [], location: [] },
    };
    view.rerender(<TypeFormDialog isOpen {...props} extensionFieldSets={[refetched, monitoringFieldSet]} />);
    expect(extensionCheckbox("inventory 2 field(s)")).toBeChecked();
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(onSubmit.mock.calls[0][0].extension_fields).toEqual({ inventory: ["serial_number", "location"] });
  });

  it("ignores a stale ticked extension on create, including for the clash check", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const props = {
      onClose: () => {},
      onSubmit,
      singularLabel: "Endpoint Type",
      defaultFields: { ...ENDPOINT_TYPE_DEFAULT_FIELDS, serial_number: stringField("Serial") },
      defaultMapping: ENDPOINT_TYPE_DEFAULT_MAPPING,
      roleOptions: ENDPOINT_ROLE_OPTIONS,
    };
    const { rerender } = render(<TypeFormDialog isOpen {...props} extensionFieldSets={[inventoryFieldSet]} />);
    await userEvent.type(screen.getByPlaceholderText("Human readable name"), "PLC");
    await userEvent.click(extensionCheckbox("inventory 2 field(s)"));
    rerender(<TypeFormDialog isOpen {...props} extensionFieldSets={[{ ...inventoryFieldSet, enabled: false }]} />);
    await userEvent.click(screen.getByRole("button", { name: "Add endpoint type" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).not.toHaveProperty("extension_fields");
  });
});
