import type { ExtensionFieldSet } from "@/generated/edge-administration/hooks/extension_fields/useGetExtensionFields";

export interface OfferedFieldSet {
  extension: string;
  fields: [string, ExtensionFieldSet["fields"][string]][];
}

/** The fields an extension-fields picker offers: enabled extensions only, without the excluded
 * keys, and without an extension that has no field left. */
export function offeredFieldSets(fieldSets: ExtensionFieldSet[], excludeKeys: Set<string>): OfferedFieldSet[] {
  return fieldSets
    .filter((set) => set.enabled)
    .map((set) => ({
      extension: set.extension,
      fields: Object.entries(set.fields).filter(([key]) => !excludeKeys.has(key)),
    }))
    .filter((set) => set.fields.length > 0);
}

/** Brings the ticked extensions up to date with what the picker offers now: a ticked extension
 * gets all its currently offered keys (so a refetch that adds or removes a field, or a key now
 * excluded, is followed), and a ticked extension that is no longer offered (disabled by a
 * refetch, or with no field left) is dropped, because the API rejects an extension listed with
 * an empty key list. */
export function filterOfferedSelection(
  selection: Record<string, string[]>,
  fieldSets: ExtensionFieldSet[],
  excludeKeys: Set<string>
): Record<string, string[]> {
  const offered = new Map(offeredFieldSets(fieldSets, excludeKeys).map((set) => [set.extension, set.fields]));
  const result: Record<string, string[]> = {};
  for (const extension of Object.keys(selection)) {
    const fields = offered.get(extension);
    if (fields) result[extension] = fields.map(([key]) => key);
  }
  return result;
}
