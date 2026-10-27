import { toast } from "react-toastify";
import { draftToRegistration, type ExtensionFormDraft } from "./extensionFormTypes";
import type { ExtensionRegistration, RouteSpec } from "./types";

/** A body_ref route's schema snapshot comes from the upstream, not the author. Strip
 * it so re-import stays a valid POST body. */
export function toAuthorManifest(registration: ExtensionRegistration): ExtensionRegistration {
  const routes = (registration.routes ?? []).map((route) => {
    const next: RouteSpec = { ...route };
    if (next.body_ref) {
      next.body = null;
      next.example = null;
    }
    return next;
  });

  return {
    schema_version: 1,
    name: registration.name,
    description: registration.description,
    upstreams: registration.upstreams,
    actions: registration.actions,
    routes,
  };
}

export function downloadDraftAsManifest(draft: ExtensionFormDraft): { ok: boolean; errors: string[] } {
  const result = draftToRegistration(draft);
  if (!result.registration) {
    toast.error(result.errors[0] ?? "Fix the form before downloading a registration file.");
    return { ok: false, errors: result.errors };
  }
  const manifest = toAuthorManifest(result.registration);
  const json = `${JSON.stringify(manifest, null, 2)}\n`;
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${manifest.name || "extension"}-registration.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return { ok: true, errors: [] };
}
