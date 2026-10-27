import { useMemo } from "react";
import { useQueries, type UseQueryResult } from "@tanstack/react-query";
import { edgeApi } from "@/generated/edge-administration/api";
import type { ExtensionContribution, ExtensionSlotName } from "./contract";
import { createExtensionApi } from "./createExtensionApi";

const STALE_TIME_MS = 5 * 60_000;
const NO_CONTRIBUTIONS: ExtensionContribution[] = [];

type DescriptorSlot = { slot: string; module: string; label: string };
/** A validated `GET /<name>/ui` descriptor. */
type ExtensionUiDescriptor = { entry: string; remoteName: string; slots: DescriptorSlot[] };

const REMOTE_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;
const MODULE = /^\.\/[A-Za-z0-9_\-/]+$/;
const MAX_LABEL_LENGTH = 64;

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/** Same-origin absolute path only: no scheme, no `//host`, no backslash, whitespace, query or fragment. */
function isAllowedEntry(entry: unknown): entry is string {
  return (
    typeof entry === "string" &&
    entry.startsWith("/") &&
    !entry.startsWith("//") &&
    !/[\\\s?#]/.test(entry)
  );
}

function parseSlot(item: unknown): DescriptorSlot | null {
  if (!isObject(item)) return null;
  const { slot, module, label } = item;
  if (typeof slot !== "string") return null;
  if (typeof module !== "string" || !MODULE.test(module)) return null;
  if (typeof label !== "string" || !label.trim() || label.length > MAX_LABEL_LENGTH) return null;
  return { slot, module, label };
}

/** Strict validation; an invalid descriptor yields null, invalid slot items are dropped. */
export function parseExtensionUiDescriptor(raw: unknown): ExtensionUiDescriptor | null {
  if (!isObject(raw)) return null;
  if (raw.contractVersion !== 1) return null;
  if (!isAllowedEntry(raw.entry)) return null;
  if (typeof raw.remoteName !== "string" || !REMOTE_NAME.test(raw.remoteName)) return null;
  if (!Array.isArray(raw.slots)) return null;
  const slots = raw.slots.map(parseSlot).filter((s): s is DescriptorSlot => s !== null);
  return { entry: raw.entry, remoteName: raw.remoteName, slots };
}

/** Never throws: anything but a valid descriptor means the extension contributes nothing. */
async function fetchDescriptor(name: string): Promise<ExtensionUiDescriptor | null> {
  try {
    const response = await createExtensionApi()(`/${encodeURIComponent(name)}/ui`);
    // 404: the extension has no UI.
    if (response.status === 404) return null;
    if (!response.ok) {
      console.warn(`Extension ${name}: GET /ui returned ${response.status}; no UI shown`);
      return null;
    }
    const descriptor = parseExtensionUiDescriptor(await response.json());
    if (!descriptor) console.warn(`Extension ${name}: invalid UI descriptor; no UI shown`);
    return descriptor;
  } catch (error) {
    console.warn(`Extension ${name}: could not load UI descriptor; no UI shown`, error);
    return null;
  }
}

// Module-level so react-query keeps the combined result stable between renders.
function combineDescriptors(results: UseQueryResult<ExtensionUiDescriptor | null>[]) {
  return { data: results.map((r) => r.data), isLoading: results.some((r) => r.isLoading) };
}

/**
 * Panels the enabled extensions contribute to `slot`, ordered by extension name.
 * Each extension describes its UI at `GET /<name>/ui`; the descriptors are cached per
 * extension (shared by every slot and page), so each one is fetched at most once per stale period.
 */
export function useExtensionContributions(slot: ExtensionSlotName): {
  contributions: ExtensionContribution[];
  isLoading: boolean;
} {
  const enabled = edgeApi.useQuery("get", "/extensions/enabled", {}, { staleTime: STALE_TIME_MS, retry: false });

  const names = useMemo(
    () =>
      enabled.isError || !Array.isArray(enabled.data)
        ? []
        : [...new Set(enabled.data.map((e) => e.name))].sort(),
    [enabled.data, enabled.isError]
  );

  const descriptors = useQueries({
    queries: names.map((name) => ({
      queryKey: ["extension-ui", name],
      queryFn: () => fetchDescriptor(name),
      staleTime: STALE_TIME_MS,
      retry: false,
    })),
    combine: combineDescriptors,
  });

  const contributions = useMemo(() => {
    const result: ExtensionContribution[] = [];
    names.forEach((extension, i) => {
      const descriptor = descriptors.data[i];
      if (!descriptor) return;
      for (const s of descriptor.slots) {
        if (s.slot !== slot) continue;
        result.push({
          extension,
          remoteName: descriptor.remoteName,
          entry: descriptor.entry,
          module: s.module,
          label: s.label,
        });
      }
    });
    return result.length ? result : NO_CONTRIBUTIONS;
  }, [names, slot, descriptors.data]);

  return { contributions, isLoading: enabled.isLoading || descriptors.isLoading };
}
