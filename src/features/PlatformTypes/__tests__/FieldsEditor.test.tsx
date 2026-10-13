import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FieldsEditor, { FieldDefinition, buildMappingPayload, rowsFromFields } from "../FieldsEditor";
import { ENDPOINT_ROLE_OPTIONS } from "../typeRoles";

function stringField(label: string): FieldDefinition {
  return { type: "string", label, required: false, ui: "input", default: null, changeable: true, show_in_list: true };
}

describe("rowsFromFields", () => {
  it("takes each row's role from the mapping", () => {
    const rows = rowsFromFields({ addr: stringField("Address"), note: stringField("Note") }, { addr: "ip" });
    expect(rows.map((r) => [r.key, r.role])).toEqual([["addr", "ip"], ["note", null]]);
  });

  it("leaves roles empty without a mapping", () => {
    expect(rowsFromFields({ addr: stringField("Address") })[0].role).toBeNull();
  });
});

describe("buildMappingPayload", () => {
  it("maps the current, trimmed key of a renamed row", () => {
    const rows = rowsFromFields({ addr: stringField("Address"), title: stringField("Title") }, { addr: "ip", title: "name" });
    rows[0] = { ...rows[0], key: " host " };
    expect(buildMappingPayload(rows)).toEqual({ host: "ip", title: "name" });
  });

  it("skips rows without a role or without a key", () => {
    const rows = rowsFromFields({ a: stringField("A"), b: stringField("B") }, { a: "ip" });
    rows[0] = { ...rows[0], key: "  " };
    expect(buildMappingPayload(rows)).toEqual({});
  });
});

describe("FieldsEditor role selector", () => {
  it("is not rendered without roleOptions", () => {
    render(<FieldsEditor rows={rowsFromFields({ addr: stringField("A") })} onChange={() => {}} />);
    expect(screen.queryByLabelText("Role of field addr")).not.toBeInTheDocument();
  });

  it("disables a role another field already has", () => {
    const rows = rowsFromFields({ addr: stringField("A"), title: stringField("T") }, { addr: "ip" });
    render(<FieldsEditor rows={rows} onChange={() => {}} roleOptions={ENDPOINT_ROLE_OPTIONS} />);
    const titleRole = screen.getByLabelText("Role of field title");
    expect(within(titleRole).getByRole("option", { name: "IP" })).toBeDisabled();
    expect(within(titleRole).getByRole("option", { name: "Name" })).not.toBeDisabled();
    expect(within(screen.getByLabelText("Role of field addr")).getByRole("option", { name: "IP" })).not.toBeDisabled();
  });

  it("sets the row's role on change", async () => {
    const onChange = vi.fn();
    render(<FieldsEditor rows={rowsFromFields({ title: stringField("T") })} onChange={onChange} roleOptions={ENDPOINT_ROLE_OPTIONS} />);
    await userEvent.selectOptions(screen.getByLabelText("Role of field title"), "name");
    expect(onChange).toHaveBeenCalledWith([expect.objectContaining({ key: "title", role: "name" })]);
  });

  it("clears the role when None is chosen", async () => {
    const onChange = vi.fn();
    render(<FieldsEditor rows={rowsFromFields({ addr: stringField("A") }, { addr: "ip" })} onChange={onChange} roleOptions={ENDPOINT_ROLE_OPTIONS} />);
    await userEvent.selectOptions(screen.getByLabelText("Role of field addr"), "");
    expect(onChange).toHaveBeenCalledWith([expect.objectContaining({ key: "addr", role: null })]);
  });
});
