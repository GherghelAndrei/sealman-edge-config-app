import { ComponentType } from "react";

export interface BrowserComponentProps {
  ip: string;
  port: number;
}

interface BrowserRegistration {
  label: string;
  component: ComponentType<BrowserComponentProps>;
}

const registry = new Map<string, BrowserRegistration>();

/**
 * Registers a "browse" action for a service kind (e.g. "vnc", "opcua", "http"). Once registered,
 * any service type assigned this kind gets a "Browse" button wherever services are shown, which
 * opens the given component with the service's actual ip/port.
 *
 * Call this once, e.g. from an app bootstrap file:
 *   registerBrowser("http", "Open in Browser", HttpBrowser)
 */
export function registerBrowser(kind: string, label: string, component: ComponentType<BrowserComponentProps>): void {
  registry.set(kind, { label, component });
}

export function unregisterBrowser(kind: string): void {
  registry.delete(kind);
}

export function getBrowser(kind: string): BrowserRegistration | undefined {
  return registry.get(kind);
}

/** All currently registered browsers as {value, label} pairs, e.g. to populate a select. */
export function listRegisteredBrowsers(): { value: string; label: string }[] {
  return [...registry.entries()].map(([value, { label }]) => ({ value, label }));
}

/**
 * The {ip, port} a Browse action opens: `ip` is the endpoint's `ip`-role value, `port` the
 * service's `port`-role value. Returns null when either is missing - then there is no Browse button.
 */
export function resolveBrowseTarget(
  ip: string | null | undefined,
  port: number | null | undefined
): BrowserComponentProps | null {
  if (!ip || port == null) return null;
  return { ip, port };
}
