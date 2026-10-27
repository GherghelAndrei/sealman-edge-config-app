/**
 * What the host passes to the panels of each slot, as `props.context`.
 * A new slot is a new entry here (plus an `<ExtensionSlot>` on its page); the rest of the
 * panel contract stays the same, so existing extensions are unaffected.
 */
export type ExtensionSlotContexts = {
  "endpoint.details": {
    deviceId: string;
    endpointId: string;
    endpointTypeId: string;
    mode: "view" | "edit"; // "edit" when the user may change the endpoint
  };
  settings: Record<string, never>;
};

export type ExtensionSlotName = keyof ExtensionSlotContexts;

/** The places in the host UI where extensions can contribute panels. */
export const EXTENSION_SLOTS = {
  endpointDetails: { name: "endpoint.details" },
  settings: { name: "settings" },
} as const satisfies Record<string, { name: ExtensionSlotName }>;
