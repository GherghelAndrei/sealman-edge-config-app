import type { ExtensionFieldSet } from "@/generated/edge-administration/hooks/extension_fields/useGetExtensionFields";

export interface ExtensionFieldsPickerProps {
  /** The extensions whose fields can be picked (the caller passes enabled ones only). */
  fieldSets: ExtensionFieldSet[];
  /** Keys not offered, e.g. the keys a type being edited already has. */
  excludeKeys: Set<string>;
  /** Ticked keys as {extension: [keys]}. */
  value: Record<string, string[]>;
  /** Gets the new selection. An extension with no ticked keys is left out, because the API
   * rejects an extension listed with an empty key list. */
  onChange: (value: Record<string, string[]>) => void;
}

/** Checkboxes for extension fields, one heading per extension. Renders nothing when no field is
 * left to offer. */
export default function ExtensionFieldsPicker({ fieldSets, excludeKeys, value, onChange }: ExtensionFieldsPickerProps) {
  const offered = fieldSets
    .map((set) => ({
      extension: set.extension,
      fields: Object.entries(set.fields).filter(([key]) => !excludeKeys.has(key)),
    }))
    .filter((set) => set.fields.length > 0);

  if (offered.length === 0) return null;

  const toggle = (extension: string, key: string, declaredKeys: string[]) => {
    const current = value[extension] ?? [];
    const nextSet = new Set(current.includes(key) ? current.filter((k) => k !== key) : [...current, key]);
    // Keep the keys in declaration order, whatever order they were ticked in.
    const nextKeys = declaredKeys.filter((k) => nextSet.has(k));
    const next = { ...value, [extension]: nextKeys };
    if (nextKeys.length === 0) delete next[extension];
    onChange(next);
  };

  return (
    <div>
      <h3 className="text-sm font-semibold mb-2">Extension fields</h3>
      <div className="space-y-3">
        {offered.map(({ extension, fields }) => {
          const declaredKeys = fields.map(([key]) => key);
          return (
            <fieldset key={extension} className="space-y-1">
              <legend className="text-sm font-medium mb-1">{extension}</legend>
              {fields.map(([key, definition]) => (
                <label key={key} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={(value[extension] ?? []).includes(key)}
                    onChange={() => toggle(extension, key, declaredKeys)}
                  />
                  {`${definition.label} (${key})`}
                </label>
              ))}
            </fieldset>
          );
        })}
      </div>
    </div>
  );
}
