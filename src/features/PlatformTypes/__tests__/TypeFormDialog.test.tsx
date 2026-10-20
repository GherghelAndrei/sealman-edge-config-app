import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TypeFormDialog, { TypeRecord } from "../TypeFormDialog";
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
