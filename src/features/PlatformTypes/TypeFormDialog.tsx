import { useEffect, useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { inputClass, validateFieldValue } from "./FieldValueInput";
import FieldsEditor, {
  Field,
  FieldDefinition,
  FieldRow,
  buildFieldsPayload,
  buildMappingPayload,
  findDuplicateKeys,
  rowsFromFields,
} from "./FieldsEditor";
import type { RoleOption } from "./typeRoles";

export interface BrowserKindOption {
  value: string;
  label: string;
}

export interface TypeRecord {
  type_id: string;
  label: string;
  description: string | null;
  fields: Record<string, FieldDefinition>;
  mapping?: Record<string, string>;
  /** {field_key: extension} for fields managed by an extension (endpoint types only). */
  managed_by?: Record<string, string>;
  browser_kind?: string | null;
}

export interface TypeFormResult {
  label: string;
  description: string | null;
  fields: Record<string, FieldDefinition | null>;
  browser_kind: string | null;
  /** The type's {field_key: role} mapping, or null for types without roles (device types). */
  mapping: Record<string, string> | null;
}

interface TypeFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (result: TypeFormResult) => Promise<void>;
  initial?: TypeRecord | null;
  singularLabel: string;
  isPending?: boolean;
  /** When set, shows a "Browse Action" dropdown letting this type be assigned one of these
   * built-in browsers (e.g. VNC, OPC-UA, plain HTTP) for its "Browse" button on the Overview page. */
  browserKindOptions?: BrowserKindOption[];
  /** When set, a brand-new type (not editing an existing one) starts with these fields
   * pre-populated instead of a single blank row - used so creating a device type shows the
   * default type's fields right away, since they'll apply to it regardless (see
   * db/sqlalchemy/device_type.py:_serialize_with_mirroring), and to pre-fill a new endpoint or
   * service type with its role fields. Ignored while editing an existing
   * type, since `initial.fields` already reflects the current mirrored view in that case. */
  defaultFields?: Record<string, FieldDefinition>;
  /** Roles of the pre-filled `defaultFields` on a brand-new type ({field_key: role}). */
  defaultMapping?: Record<string, string>;
  /** When set, each field row gets a Role selector and the result carries `mapping`. */
  roleOptions?: RoleOption[];
  /** When set, each field row gets a "Show in list" toggle controlling whether its value shows
   * as extra info in the endpoints list - only meaningful for endpoint types. */
  supportsListVisibility?: boolean;
}

export default function TypeFormDialog({
  isOpen,
  onClose,
  onSubmit,
  initial,
  singularLabel,
  isPending,
  browserKindOptions,
  defaultFields,
  defaultMapping,
  roleOptions,
  supportsListVisibility,
}: TypeFormDialogProps) {
  const isEdit = Boolean(initial);

  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [browserKind, setBrowserKind] = useState("");
  const [rows, setRows] = useState<FieldRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLabel(initial?.label ?? "");
    setDescription(initial?.description ?? "");
    setBrowserKind(initial?.browser_kind ?? "");
    if (initial) {
      setRows(rowsFromFields(initial.fields, initial.mapping ?? {}, initial.managed_by ?? {}));
    } else if (defaultFields && Object.keys(defaultFields).length > 0) {
      setRows(rowsFromFields(defaultFields, defaultMapping ?? {}));
    } else {
      // No pre-filled blank row - the user presses "Add field" to start defining one.
      setRows([]);
    }
    setError(null);
  }, [isOpen, initial, defaultFields, defaultMapping]);

  if (!isOpen) return null;

  const duplicateKeys = findDuplicateKeys(rows);

  const handleSave = async () => {
    const trimmedLabel = label.trim();

    if (!trimmedLabel) {
      setError("Label is required");
      return;
    }

    if (duplicateKeys.size > 0) {
      setError(`Duplicate field key${duplicateKeys.size > 1 ? "s" : ""}: ${[...duplicateKeys].join(", ")}`);
      return;
    }

    for (const row of rows) {
      if (!row.key.trim()) {
        setError("Every field needs a key");
        return;
      }
      if (!row.definition.label.trim()) {
        setError(`Field "${row.key.trim()}" needs a label`);
        return;
      }
      const ui = row.definition.ui;
      if ((ui === "select" || ui === "radio") && (row.definition.options ?? []).length === 0) {
        setError(`Field "${row.key.trim()}" needs at least one option`);
        return;
      }

      const validation = row.definition.validation;
      if (validation?.pattern) {
        try {
          new RegExp(validation.pattern);
        } catch {
          setError(`Field "${row.key.trim()}" has an invalid regex pattern`);
          return;
        }
      }
      if (
        validation?.min_length != null &&
        validation?.max_length != null &&
        validation.min_length > validation.max_length
      ) {
        setError(`Field "${row.key.trim()}": min length cannot be greater than max length`);
        return;
      }
      if (validation?.minimum != null && validation?.maximum != null && validation.minimum > validation.maximum) {
        setError(`Field "${row.key.trim()}": minimum cannot be greater than maximum`);
        return;
      }
      if (ui === "slider" && (validation?.minimum == null || validation?.maximum == null)) {
        setError(`Field "${row.key.trim()}": a slider needs both a minimum and a maximum`);
        return;
      }
      if (row.definition.default != null) {
        const defaultError = validateFieldValue(row.definition.label || row.key.trim(), row.definition.default, row.definition);
        if (defaultError) {
          setError(`Field "${row.key.trim()}" default value: ${defaultError}`);
          return;
        }
      }
    }

    const originalKeys = Object.keys(initial?.fields ?? {});
    const fields = buildFieldsPayload(rows, originalKeys);

    try {
      await onSubmit({
        label: trimmedLabel,
        description: description.trim() || null,
        fields,
        browser_kind: browserKind || null,
        mapping: roleOptions ? buildMappingPayload(rows) : null,
      });
      setError(null);
    } catch {
      setError(`Failed to save ${singularLabel.toLowerCase()}`);
    }
  };

  return (
    <div role="dialog" className="fixed inset-0 flex items-center justify-center bg-gray-900/50 z-20 p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b flex items-center justify-between shrink-0">
          <h2 className="text-lg font-semibold">
            {isEdit ? `Edit ${singularLabel}` : `Add ${singularLabel}`}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-5 overflow-y-auto">
          {isEdit && (
            <Field label="Type ID">
              <input
                type="text"
                value={(initial as TypeRecord).type_id}
                disabled
                className={`${inputClass} font-mono opacity-60 cursor-not-allowed`}
              />
            </Field>
          )}

          <Field label="Label *">
            <input
              type="text"
              placeholder="Human readable name"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="Description">
            <input
              type="text"
              placeholder="Optional description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={inputClass}
            />
          </Field>

          {browserKindOptions && (
            <Field label="Browse Action">
              <select
                value={browserKind}
                onChange={(e) => setBrowserKind(e.target.value)}
                className={inputClass}
              >
                <option value="">None</option>
                {browserKindOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </Field>
          )}

          <div>
            <h3 className="text-sm font-semibold mb-2">Fields</h3>
            <FieldsEditor
              rows={rows}
              onChange={setRows}
              duplicateKeys={duplicateKeys}
              showListVisibility={supportsListVisibility}
              roleOptions={roleOptions}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <div className="px-6 py-4 border-t flex justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="px-4 py-1.5 rounded-md text-sm font-medium border border-slate-200 hover:bg-muted/60 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending || duplicateKeys.size > 0}
            className="px-4 py-1.5 rounded-md text-sm font-medium bg-primary text-white hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            {isPending ? "Saving..." : isEdit ? "Save changes" : `Add ${singularLabel.toLowerCase()}`}
          </button>
        </div>
      </div>
    </div>
  );
}
