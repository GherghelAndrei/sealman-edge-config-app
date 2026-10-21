import type { components } from "@/generated/edge-administration/types";

type FieldDefinition = components["schemas"]["FieldDefinition"];
type ResolvedField = components["schemas"]["ResolvedField"];

/**
 * Initial form values when an endpoint switches to another type: the endpoint's stored value for
 * every key the new type also defines, otherwise the field's default (Q14). This way a default
 * never overwrites stored data, and a required field that already has a stored value passes.
 */
export function initialRetypeValues(
  fields: Record<string, FieldDefinition>,
  currentData: Record<string, ResolvedField> | undefined,
): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const [key, definition] of Object.entries(fields)) {
    values[key] = currentData?.[key]?.value ?? definition.default ?? null;
  }
  return values;
}

/**
 * Only the values that are set. In a PATCH, `null` means "delete this key", so a retype leaves
 * empty fields out and the API keeps the stored data (Q15). "Empty" matches validateFields:
 * null, undefined or "".
 */
export function nonEmptyValues(values: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => value !== null && value !== undefined && value !== "")
  );
}
