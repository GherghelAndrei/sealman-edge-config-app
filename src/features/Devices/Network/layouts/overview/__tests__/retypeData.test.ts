import { describe, expect, it } from "vitest";
import type { components } from "@/generated/edge-administration/types";
import { initialRetypeValues, nonEmptyValues } from "../retypeData";

type FieldDefinition = components["schemas"]["FieldDefinition"];

function field(label: string, extra: Partial<FieldDefinition> = {}): FieldDefinition {
  return { type: "string", label, required: false, ui: "input", default: null, changeable: true, show_in_list: true, ...extra };
}

describe("initialRetypeValues", () => {
  it("pre-fills matching keys with the stored value, even over a default", () => {
    const values = initialRetypeValues(
      { serial: field("Serial", { default: "UNKNOWN" }), location: field("Location") },
      { serial: { value: "S-1", field: null }, note: { value: "keep", field: null } },
    );
    expect(values).toEqual({ serial: "S-1", location: null });
  });

  it("uses the field default when there is no stored value", () => {
    expect(initialRetypeValues({ serial: field("Serial", { default: "UNKNOWN" }) }, {})).toEqual({ serial: "UNKNOWN" });
  });
});

describe("nonEmptyValues", () => {
  it("drops null, undefined and empty strings but keeps false and 0", () => {
    expect(nonEmptyValues({ a: null, b: undefined, c: "", d: "x", e: 0, f: false })).toEqual({ d: "x", e: 0, f: false });
  });
});
