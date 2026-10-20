import { describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FieldsEditor, { FieldDefinition, FieldRow, buildMappingPayload, emptyFieldRow, rowsFromFields } from "../FieldsEditor";
import { ENDPOINT_ROLE_OPTIONS, SERVICE_ROLE_OPTIONS } from "../typeRoles";

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

  it("disables roles whose field type differs from the row's type", () => {
    const rows = rowsFromFields({ count: { ...stringField("C"), type: "integer", ui: "number" }, addr: stringField("A") });
    const { rerender } = render(<FieldsEditor rows={rows} onChange={() => {}} roleOptions={ENDPOINT_ROLE_OPTIONS} />);
    const intRole = screen.getByLabelText("Role of field count");
    expect(within(intRole).getByRole("option", { name: "IP" })).toBeDisabled();
    expect(within(intRole).getByRole("option", { name: "Name" })).toBeDisabled();
    rerender(<FieldsEditor rows={rows} onChange={() => {}} roleOptions={SERVICE_ROLE_OPTIONS} />);
    expect(within(screen.getByLabelText("Role of field addr")).getByRole("option", { name: "Port" })).toBeDisabled();
    expect(within(screen.getByLabelText("Role of field count")).getByRole("option", { name: "Port" })).not.toBeDisabled();
  });

  it("disables the selector while the key is empty", () => {
    const rows = rowsFromFields({ a: stringField("A") });
    rows[0] = { ...rows[0], key: "  " };
    render(<FieldsEditor rows={rows} onChange={() => {}} roleOptions={ENDPOINT_ROLE_OPTIONS} />);
    expect(screen.getByLabelText("Role of field")).toBeDisabled();
  });

  it("clears the role when the field type changes to one that does not fit", async () => {
    // jsdom lacks these; Radix Select needs them to open
    Element.prototype.hasPointerCapture ??= () => false;
    Element.prototype.setPointerCapture ??= () => {};
    Element.prototype.releasePointerCapture ??= () => {};
    Element.prototype.scrollIntoView ??= () => {};
    const onChange = vi.fn();
    render(<FieldsEditor rows={rowsFromFields({ addr: stringField("A") }, { addr: "ip" })} onChange={onChange} roleOptions={ENDPOINT_ROLE_OPTIONS} />);
    const typeTrigger = screen.getAllByRole("combobox").find((el) => el.tagName === "BUTTON")!;
    await userEvent.click(typeTrigger);
    await userEvent.click(await screen.findByRole("option", { name: /integer/i }));
    expect(onChange).toHaveBeenCalledWith([expect.objectContaining({ key: "addr", role: null })]);
  });

  it("carries the role to a key renamed through the key input", async () => {
    const latest: { rows: FieldRow[] } = { rows: [] };
    function Harness() {
      const [rows, setRows] = useState(() => rowsFromFields({ addr: stringField("A") }, { addr: "ip" }));
      return (
        <FieldsEditor
          rows={rows}
          onChange={(next) => {
            latest.rows = next;
            setRows(next);
          }}
          roleOptions={ENDPOINT_ROLE_OPTIONS}
        />
      );
    }
    render(<Harness />);
    const keyInput = screen.getByPlaceholderText("field_key");
    await userEvent.clear(keyInput);
    await userEvent.type(keyInput, "host");
    expect(buildMappingPayload(latest.rows)).toEqual({ host: "ip" });
  });
});

describe("rowsFromFields managedBy", () => {
  it("takes managedBy from the map", () => {
    const rows = rowsFromFields(
      { serial_number: stringField("Serial"), note: stringField("Note") },
      {},
      { serial_number: "inventory" }
    );
    expect(rows.map((r) => [r.key, r.managedBy])).toEqual([["serial_number", "inventory"], ["note", null]]);
  });

  it("starts a new row unmanaged", () => {
    expect(emptyFieldRow().managedBy).toBeNull();
  });
});

describe("FieldsEditor managed row", () => {
  function managedRows() {
    return rowsFromFields(
      {
        serial_number: {
          ...stringField("Serial"),
          ui: "select",
          options: ["a", "b"],
          description: "From the inventory",
        },
      },
      {},
      { serial_number: "inventory" }
    );
  }

  function renderManaged(onChange = vi.fn()) {
    render(<FieldsEditor rows={managedRows()} onChange={onChange} roleOptions={ENDPOINT_ROLE_OPTIONS} showListVisibility />);
    return onChange;
  }

  function toggleOf(labelText: string) {
    return within(screen.getByText(labelText).closest("label")!).getByRole("switch");
  }

  it("shows which extension it comes from", () => {
    renderManaged();
    expect(screen.getByText("from inventory")).toBeInTheDocument();
  });

  it("locks everything except label, description and show in list", async () => {
    renderManaged();
    expect(screen.getByPlaceholderText("field_key")).toBeDisabled();
    const [typeTrigger, widgetTrigger] = screen.getAllByRole("combobox").filter((el) => el.tagName === "BUTTON");
    expect(typeTrigger).toBeDisabled();
    expect(widgetTrigger).toBeDisabled();
    expect(toggleOf("Required")).toBeDisabled();
    expect(toggleOf("Changeable")).toBeDisabled();
    expect(screen.getByPlaceholderText("option1, option2, option3")).toBeDisabled();
    expect(screen.getByLabelText("Role of field serial_number")).toBeDisabled();

    expect(screen.getByPlaceholderText("Human readable label")).toBeEnabled();
    expect(screen.getByPlaceholderText("Optional help text")).toBeEnabled();
    expect(toggleOf("Show in list")).toBeEnabled();

    await userEvent.click(toggleOf("Validation options"));
    expect(screen.getByPlaceholderText("e.g. ^[A-Z]{2}\\d{4}$")).toBeDisabled();
    expect(screen.getAllByRole("spinbutton").every((el) => (el as HTMLInputElement).disabled)).toBe(true);
  });

  it("locks the default value input", () => {
    render(
      <FieldsEditor
        rows={rowsFromFields({ serial_number: stringField("Serial") }, {}, { serial_number: "inventory" })}
        onChange={() => {}}
      />
    );
    expect(within(screen.getByText("Default value").parentElement!).getByRole("textbox")).toBeDisabled();
  });

  it("locks the validation inputs of a number field", async () => {
    render(
      <FieldsEditor
        rows={rowsFromFields({ count: { ...stringField("Count"), type: "integer", ui: "number" } }, {}, { count: "inventory" })}
        onChange={() => {}}
      />
    );
    await userEvent.click(toggleOf("Validation options"));
    // the "Test this field" sandbox doesn't change the definition, so it stays usable
    const tester = screen.getByPlaceholderText("Try a value...");
    expect(tester).toBeEnabled();
    const constraintInputs = screen.getAllByRole("spinbutton").filter((el) => el !== tester);
    expect(constraintInputs.length).toBeGreaterThan(0);
    for (const el of constraintInputs) expect(el).toBeDisabled();
    expect(toggleOf("Exclusive min")).toBeDisabled();
    expect(toggleOf("Exclusive max")).toBeDisabled();
  });

  it("can still be removed", async () => {
    const onChange = renderManaged();
    await userEvent.click(screen.getByRole("button", { name: "Remove field" }));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it("lets the label be edited", async () => {
    const onChange = renderManaged();
    await userEvent.type(screen.getByPlaceholderText("Human readable label"), "X");
    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({ key: "serial_number", definition: expect.objectContaining({ label: "SerialX" }) }),
    ]);
  });
});

describe("a managed row's role is never offered", () => {
  it("has a disabled Role select with value ''", () => {
    const rows = rowsFromFields({ serial_number: stringField("Serial") }, { serial_number: "name" }, { serial_number: "inventory" });
    render(<FieldsEditor rows={rows} onChange={() => {}} roleOptions={ENDPOINT_ROLE_OPTIONS} />);
    const role = screen.getByLabelText("Role of field serial_number");
    expect(role).toBeDisabled();
    expect(role).toHaveValue("");
  });
});
