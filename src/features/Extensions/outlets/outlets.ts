export type OutletTarget = "global" | "device" | "endpoint" | "module";
export type OutletPlacement = "section" | "tab" | "page" | "replace:config";

/** The outlets this app version renders. Contributions for any other pair are ignored. */
export const SUPPORTED_OUTLETS: ReadonlyArray<{ target: OutletTarget; placement: OutletPlacement }> = [
  { target: "global", placement: "section" },
  { target: "global", placement: "page" },
  { target: "device", placement: "tab" },
  { target: "endpoint", placement: "section" },
  { target: "module", placement: "replace:config" },
];

export function isSupportedOutlet(target: string, placement: string): boolean {
  return SUPPORTED_OUTLETS.some((o) => o.target === target && o.placement === placement);
}
