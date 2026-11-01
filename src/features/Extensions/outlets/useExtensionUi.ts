import { useMemo } from "react";
import { edgeApi } from "@/generated/edge-administration/api";
import { isSupportedOutlet, type OutletPlacement, type OutletTarget } from "./outlets";

const STALE_TIME_MS = 60_000;

/** One panel an extension contributes to an outlet, from `GET /extensions/ui`. */
export type Contribution = {
  extension: string;
  remoteName: string;
  entry: string;
  module: string;
  label: string;
  target: string;
  placement: string;
  path?: string;
  when?: Record<string, string[]>;
};

/** An extension's `ui` entry that passed validation. */
export type ValidatedUiEntry = {
  name: string;
  remoteName: string;
  entry: string;
  contributions: Contribution[];
};

const NAME = /^[a-z][a-z0-9.:-]*$/;
const REMOTE_NAME = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
const MODULE = /^\.\/[A-Za-z0-9_./-]+$/;
const PATH = /^[a-z0-9-]+$/;
const MAX_LABEL_LENGTH = 60;
const NO_ENTRIES: ValidatedUiEntry[] = [];
const NO_CONTRIBUTIONS: Contribution[] = [];

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/** Same-origin absolute path only: no scheme, no `//host`, no backslash, whitespace, query or fragment. */
function isAllowedEntry(entry: unknown): entry is string {
  return (
    typeof entry === "string" &&
    entry.startsWith("/") &&
    !entry.startsWith("//") &&
    !/[\\\s?#]/.test(entry) &&
    entry.endsWith(".js")
  );
}

function parseWhen(when: unknown): Record<string, string[]> | undefined | null {
  if (when === undefined || when === null) return undefined;
  if (!isObject(when)) return null;
  for (const values of Object.values(when)) {
    if (!Array.isArray(values) || !values.every((v) => typeof v === "string")) return null;
  }
  return when as Record<string, string[]>;
}

function parseContribution(
  item: unknown,
  extension: string,
  remoteName: string,
  entry: string
): Contribution | null {
  if (!isObject(item)) return null;
  const { target, placement, module, label, path } = item;
  if (typeof target !== "string" || !NAME.test(target)) return null;
  if (typeof placement !== "string" || !NAME.test(placement)) return null;
  if (typeof module !== "string" || !MODULE.test(module)) return null;
  if (typeof label !== "string" || !label.trim() || label.length > MAX_LABEL_LENGTH) return null;
  if (path !== undefined && path !== null && (typeof path !== "string" || !PATH.test(path))) return null;
  const when = parseWhen(item.when);
  if (when === null) return null;
  return {
    extension,
    remoteName,
    entry,
    module,
    label,
    target,
    placement,
    ...(typeof path === "string" ? { path } : {}),
    ...(when ? { when } : {}),
  };
}

/** Strict validation; an invalid entry yields null, invalid contributions are dropped. */
function parseEntry(raw: unknown): ValidatedUiEntry | null {
  if (!isObject(raw)) return null;
  if (typeof raw.name !== "string" || !raw.name) return null;
  if (raw.contractVersion !== 1) return null;
  if (!isAllowedEntry(raw.entry)) return null;
  if (typeof raw.remoteName !== "string" || !REMOTE_NAME.test(raw.remoteName)) return null;
  if (!Array.isArray(raw.contributions)) return null;
  const { name, entry, remoteName } = raw;
  const contributions = raw.contributions
    .map((c) => parseContribution(c, name, remoteName, entry))
    .filter((c): c is Contribution => c !== null);
  return { name, remoteName, entry, contributions };
}

/** A contribution matches when, for every `when` field, the context value is in the list. */
export function matchesWhen(
  when: Record<string, string[]> | undefined,
  context: Record<string, unknown> | undefined
): boolean {
  if (!when) return true;
  return Object.entries(when).every(([field, values]) => {
    const value = context?.[field];
    return typeof value === "string" && values.includes(value);
  });
}

/** All enabled extensions' validated UI sections: one cached call to `GET /extensions/ui`. */
export function useExtensionUi(): { entries: ValidatedUiEntry[]; isLoading: boolean } {
  const query = edgeApi.useQuery("get", "/extensions/ui", {}, { staleTime: STALE_TIME_MS, retry: false });

  const entries = useMemo(() => {
    if (query.isError || !Array.isArray(query.data)) return NO_ENTRIES;
    const result: ValidatedUiEntry[] = [];
    for (const raw of query.data) {
      const entry = parseEntry(raw);
      if (entry) result.push(entry);
      else console.warn(`Extension ${String((raw as { name?: unknown })?.name)}: invalid ui entry; no UI shown`);
    }
    return result;
  }, [query.data, query.isError]);

  return { entries, isLoading: query.isLoading };
}

/** Contributions for one outlet, filtered by `when`, sorted by label then extension. */
export function useContributions(
  target: OutletTarget,
  placement: OutletPlacement,
  context?: Record<string, unknown>
): { contributions: Contribution[]; isLoading: boolean } {
  const { entries, isLoading } = useExtensionUi();
  const contextKey = JSON.stringify(context ?? null);

  const contributions = useMemo(() => {
    if (!isSupportedOutlet(target, placement)) return NO_CONTRIBUTIONS;
    const ctx = JSON.parse(contextKey) as Record<string, unknown> | null;
    const result = entries
      .flatMap((e) => e.contributions)
      .filter((c) => c.target === target && c.placement === placement && matchesWhen(c.when, ctx ?? undefined))
      .sort((a, b) => a.label.localeCompare(b.label) || a.extension.localeCompare(b.extension));
    return result.length ? result : NO_CONTRIBUTIONS;
  }, [entries, target, placement, contextKey]);

  return { contributions, isLoading };
}
