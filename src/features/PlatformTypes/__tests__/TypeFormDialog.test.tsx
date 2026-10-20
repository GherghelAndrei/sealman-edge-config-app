import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TypeFormDialog, { TypeRecord } from "../TypeFormDialog";
import ExtensionFieldsPicker from "../ExtensionFieldsPicker";
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

describe("TypeFormDialog extension fields on create", () => {
  it("create shows an Extension fields section with every field unchecked", () => {
    renderEndpointCreateWithExtensions();
    expect(screen.getByText("Extension fields")).toBeInTheDocument();
    expect(screen.getByText("inventory")).toBeInTheDocument();
    expect(screen.getByText("monitoring")).toBeInTheDocument();
    expect(screen.getByLabelText("Serial number (serial_number)")).not.toBeChecked();
    expect(screen.getByLabelText("Asset tag (asset_tag)")).not.toBeChecked();
    expect(screen.getByLabelText("Poll interval (poll_interval)")).not.toBeChecked();
  });

  it("checking a field sends extension_fields grouped by extension", async () => {
    const onSubmit = renderEndpointCreateWithExtensions();
    await userEvent.type(screen.getByPlaceholderText("Human readable name"), "PLC");
    await userEvent.click(screen.getByLabelText("Serial number (serial_number)"));
    await userEvent.click(screen.getByRole("button", { name: "Add endpoint type" }));
    expect(onSubmit.mock.calls[0][0].extension_fields).toEqual({ inventory: ["serial_number"] });
  });

  it("omits an extension whose fields were checked and then unchecked", async () => {
    const onSubmit = renderEndpointCreateWithExtensions();
    await userEvent.type(screen.getByPlaceholderText("Human readable name"), "PLC");
    await userEvent.click(screen.getByLabelText("Asset tag (asset_tag)"));
    await userEvent.click(screen.getByLabelText("Poll interval (poll_interval)"));
    await userEvent.click(screen.getByLabelText("Asset tag (asset_tag)"));
    await userEvent.click(screen.getByRole("button", { name: "Add endpoint type" }));
    expect(onSubmit.mock.calls[0][0].extension_fields).toEqual({ monitoring: ["poll_interval"] });
  });

  it("sends no extension_fields when nothing is checked", async () => {
    const onSubmit = renderEndpointCreateWithExtensions();
    await userEvent.type(screen.getByPlaceholderText("Human readable name"), "PLC");
    await userEvent.click(screen.getByRole("button", { name: "Add endpoint type" }));
    expect(onSubmit.mock.calls[0][0]).not.toHaveProperty("extension_fields");
  });

  it("blocks save when a checked key is also a row key", async () => {
    const onSubmit = renderEndpointCreateWithExtensions({ ...ENDPOINT_TYPE_DEFAULT_FIELDS, serial_number: stringField("Serial") });
    await userEvent.type(screen.getByPlaceholderText("Human readable name"), "PLC");
    await userEvent.click(screen.getByLabelText("Serial number (serial_number)"));
    await userEvent.click(screen.getByRole("button", { name: "Add endpoint type" }));
    expect(screen.getByText('Field "serial_number" is also selected as an extension field')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows no Extension fields section without field sets", () => {
    renderEndpointCreate();
    expect(screen.queryByText("Extension fields")).not.toBeInTheDocument();
  });
});

describe("ExtensionFieldsPicker", () => {
  it("hides excluded keys and an extension left with none", () => {
    render(
      <ExtensionFieldsPicker
        fieldSets={[inventoryFieldSet, monitoringFieldSet]}
        excludeKeys={new Set(["serial_number", "poll_interval"])}
        value={{}}
        onChange={() => {}}
      />
    );
    expect(screen.queryByLabelText("Serial number (serial_number)")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Asset tag (asset_tag)")).toBeInTheDocument();
    expect(screen.queryByText("monitoring")).not.toBeInTheDocument();
  });

  it("renders nothing when no field is left to offer", () => {
    const { container } = render(
      <ExtensionFieldsPicker fieldSets={[monitoringFieldSet]} excludeKeys={new Set(["poll_interval"])} value={{}} onChange={() => {}} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("reports ticked keys in declaration order and drops an extension with none", async () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <ExtensionFieldsPicker fieldSets={[inventoryFieldSet]} excludeKeys={new Set()} value={{ inventory: ["asset_tag"] }} onChange={onChange} />
    );
    expect(screen.getByLabelText("Asset tag (asset_tag)")).toBeChecked();
    await userEvent.click(screen.getByLabelText("Serial number (serial_number)"));
    expect(onChange).toHaveBeenLastCalledWith({ inventory: ["serial_number", "asset_tag"] });
    rerender(
      <ExtensionFieldsPicker fieldSets={[inventoryFieldSet]} excludeKeys={new Set()} value={{ inventory: ["asset_tag"] }} onChange={onChange} />
    );
    await userEvent.click(screen.getByLabelText("Asset tag (asset_tag)"));
    expect(onChange).toHaveBeenLastCalledWith({});
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
  it("edit lists only enabled-extension fields whose key is not on the type, all unchecked", () => {
    renderEndpointEditWithExtensions();
    expect(screen.getByText("Extension fields")).toBeInTheDocument();
    expect(screen.queryByLabelText("Serial number (serial_number)")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Asset tag (asset_tag)")).not.toBeChecked();
    expect(screen.getByLabelText("Poll interval (poll_interval)")).not.toBeChecked();
  });

  it("Save sends the field edits and the ticked extension_fields in one onSubmit result", async () => {
    const record: TypeRecord = { ...plcRecord, fields: { ip: stringField("Host") } };
    const { onSubmit } = renderEndpointEditWithExtensions(record);
    const labelInput = screen.getByDisplayValue("Host");
    await userEvent.clear(labelInput);
    await userEvent.type(labelInput, "Address");
    await userEvent.click(screen.getByLabelText("Serial number (serial_number)"));
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    const result = onSubmit.mock.calls[0][0];
    expect(result.fields.ip).toMatchObject({ label: "Address" });
    expect(result.extension_fields).toEqual({ inventory: ["serial_number"] });
  });

  it("Save without ticks sends no extension_fields", async () => {
    const { onSubmit } = renderEndpointEditWithExtensions();
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(onSubmit.mock.calls[0][0]).not.toHaveProperty("extension_fields");
  });

  it("blocks save when a ticked key is also a new row key", async () => {
    const { onSubmit } = renderEndpointEditWithExtensions();
    await userEvent.click(screen.getByLabelText("Poll interval (poll_interval)"));
    await userEvent.click(screen.getByRole("button", { name: "Add field" }));
    const keyInputs = screen.getAllByPlaceholderText("field_key");
    await userEvent.type(keyInputs[keyInputs.length - 1], "poll_interval");
    const labelInputs = screen.getAllByPlaceholderText("Human readable label");
    await userEvent.type(labelInputs[labelInputs.length - 1], "Poll");
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(screen.getByText('Field "poll_interval" is also selected as an extension field')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("resets the ticked fields when the dialog is reopened", async () => {
    const { view, props } = renderEndpointEditWithExtensions();
    await userEvent.click(screen.getByLabelText("Asset tag (asset_tag)"));
    view.rerender(<TypeFormDialog isOpen={false} {...props} extensionFieldSets={[inventoryFieldSet, monitoringFieldSet]} />);
    view.rerender(<TypeFormDialog isOpen {...props} extensionFieldSets={[inventoryFieldSet, monitoringFieldSet]} />);
    expect(screen.getByLabelText("Asset tag (asset_tag)")).not.toBeChecked();
  });
});

describe("TypeFormDialog drops stale extension field ticks", () => {
  it("does not send a ticked field whose extension is no longer offered (edit)", async () => {
    const { onSubmit, view, props } = renderEndpointEditWithExtensions();
    await userEvent.click(screen.getByLabelText("Asset tag (asset_tag)"));
    await userEvent.click(screen.getByLabelText("Poll interval (poll_interval)"));
    // A refetch while the dialog is open disables "inventory".
    view.rerender(<TypeFormDialog isOpen {...props} extensionFieldSets={[monitoringFieldSet]} />);
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(onSubmit.mock.calls[0][0].extension_fields).toEqual({ monitoring: ["poll_interval"] });
  });

  it("ignores a stale ticked key on create, including for the clash check", async () => {
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
    await userEvent.click(screen.getByLabelText("Serial number (serial_number)"));
    rerender(<TypeFormDialog isOpen {...props} extensionFieldSets={[{ ...inventoryFieldSet, enabled: false }]} />);
    await userEvent.click(screen.getByRole("button", { name: "Add endpoint type" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).not.toHaveProperty("extension_fields");
  });
});
