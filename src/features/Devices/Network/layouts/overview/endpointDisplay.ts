export type RoleMapping = Record<string, string>;

/** Key of the field that carries `role` on a type, or null. */
export function roleFieldKey(mapping: RoleMapping | undefined, role: string): string | null {
  for (const [key, mapped] of Object.entries(mapping ?? {})) {
    if (mapped === role) return key;
  }
  return null;
}

/** Keys of the fields with the `ip` or `name` role - shown in the title, not as extra info. */
export function titleFieldKeys(mapping: RoleMapping | undefined): Set<string> {
  return new Set(
    Object.entries(mapping ?? {})
      .filter(([, role]) => role === "ip" || role === "name")
      .map(([key]) => key)
  );
}

/**
 * An endpoint's title (spec §1.4): the `name`-role value. Without one (no role, or empty value),
 * the type label, plus " · <ip>" when the `ip`-role value is set. Scan rows without a type are
 * "Unidentified".
 */
export function endpointTitle({ typeLabel, name, ip }: { typeLabel?: string | null; name?: unknown; ip?: unknown }): string {
  if (typeof name === "string" && name.trim() !== "") return name;
  if (!typeLabel) return "Unidentified";
  return typeof ip === "string" && ip !== "" ? `${typeLabel} · ${ip}` : typeLabel;
}
