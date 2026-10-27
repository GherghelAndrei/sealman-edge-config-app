import type { ExtensionSlotContexts, ExtensionSlotName } from "./slots";

export type { ExtensionSlotContexts, ExtensionSlotName };

/** One panel an extension contributes to a slot, taken from its `GET /<name>/ui` descriptor. */
export type ExtensionContribution = {
  extension: string;
  remoteName: string;
  entry: string;
  module: string;
  label: string;
};

export type ExtensionNotification = {
  message: string;
  severity: "info" | "success" | "warning" | "error";
};

/** What every panel gets from the host, whatever its slot. */
export type ExtensionHostApi = {
  api: (path: string, init?: RequestInit) => Promise<Response>; // path must start with /; host adds base URL + bearer token
  notify: (n: ExtensionNotification) => void;
  onDataChanged: () => void; // call after the panel changed data the host page shows
};

/**
 * Props of a panel rendered in slot `S`. Without `S` it is the union over all slots,
 * narrowed by checking `props.slot`.
 */
export type ExtensionPanelProps<S extends ExtensionSlotName = ExtensionSlotName> = {
  [K in S]: { contractVersion: 1; slot: K; context: ExtensionSlotContexts[K] } & ExtensionHostApi;
}[S];

export const EXTENSION_PANEL_CONTRACT_VERSION = 1 as const;
