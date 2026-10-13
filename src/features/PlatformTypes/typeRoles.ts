import type { FieldDefinition } from "./FieldsEditor";

/** A role a type field can carry (stored in the type's `mapping` as {field_key: role}). */
export interface RoleOption {
  value: string;
  label: string;
}

export const ENDPOINT_ROLE_OPTIONS: RoleOption[] = [
  { value: "ip", label: "IP" },
  { value: "name", label: "Name" },
];

export const SERVICE_ROLE_OPTIONS: RoleOption[] = [{ value: "port", label: "Port" }];

// UI defaults for a new type (the API adds no fields). All removable, none required.
export const ENDPOINT_TYPE_DEFAULT_FIELDS: Record<string, FieldDefinition> = {
  ip: { type: "string", label: "IP Address", required: false, ui: "input", default: null, changeable: true, show_in_list: false },
  name: { type: "string", label: "Name", required: false, ui: "input", default: null, changeable: true, show_in_list: false },
};

export const ENDPOINT_TYPE_DEFAULT_MAPPING: Record<string, string> = { ip: "ip", name: "name" };

export const SERVICE_TYPE_DEFAULT_FIELDS: Record<string, FieldDefinition> = {
  port: {
    type: "integer",
    label: "Port",
    required: false,
    ui: "number",
    default: null,
    changeable: true,
    show_in_list: false,
    validation: { minimum: 0, maximum: 65535, exclusive_minimum: false, exclusive_maximum: false },
  },
};

export const SERVICE_TYPE_DEFAULT_MAPPING: Record<string, string> = { port: "port" };
