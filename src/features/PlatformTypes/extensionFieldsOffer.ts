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

/** Keeps only the ticked keys the picker still offers, so a stale tick (an extension disabled by
 * a refetch, or a key now excluded) is never sent. An extension left with no keys is dropped,
 * because the API rejects an extension listed with an empty key list. */
export function filterOfferedSelection(
  selection: Record<string, string[]>,
  fieldSets: ExtensionFieldSet[],
  excludeKeys: Set<string>
): Record<string, string[]> {
  const offered = new Map(
    offeredFieldSets(fieldSets, excludeKeys).map((set) => [set.extension, new Set(set.fields.map(([key]) => key))])
  );
  const result: Record<string, string[]> = {};
  for (const [extension, keys] of Object.entries(selection)) {
    const offeredKeys = offered.get(extension);
    if (!offeredKeys) continue;
    const kept = keys.filter((key) => offeredKeys.has(key));
    if (kept.length > 0) result[extension] = kept;
  }
  return result;
}
