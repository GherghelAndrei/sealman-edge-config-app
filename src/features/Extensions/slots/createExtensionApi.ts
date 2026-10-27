import { getAccessToken } from "@/auth";
import type { ExtensionPanelProps } from "./contract";

type ExtensionApiDeps = {
  getToken?: () => Promise<string>;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
};

/**
 * Builds the `api` function handed to an extension panel: fetch against the
 * API base URL with the user's bearer token. The token stays inside this
 * closure; the API enforces permissions.
 */
export function createExtensionApi(deps: ExtensionApiDeps = {}): ExtensionPanelProps["api"] {
  const getToken = deps.getToken ?? (getAccessToken as () => Promise<string>);
  const baseUrl = deps.baseUrl ?? `${import.meta.env.VITE_API_URI}`;
  const fetchImpl = deps.fetchImpl ?? ((...args: Parameters<typeof fetch>) => fetch(...args));

  return async (path, init) => {
    const notAllowed = () => new Error(`Extension path not allowed: ${String(path)}`);
    if (typeof path !== "string" || !path.startsWith("/") || path.startsWith("//") || path.includes("\\")) {
      throw notAllowed();
    }
    const base = baseUrl.replace(/\/+$/, "");
    const target = base + path;
    // The bearer token must only ever go to the API origin.
    let sameOrigin = false;
    try {
      sameOrigin =
        new URL(target, window.location.origin).origin === new URL(base || "/", window.location.origin).origin;
    } catch {
      sameOrigin = false;
    }
    if (!sameOrigin) throw notAllowed();
    const headers = new Headers(init?.headers);
    headers.set("Authorization", `Bearer ${await getToken()}`);
    return fetchImpl(target, { ...init, headers });
  };
}
