import { coerceScopeParam, pathParamNames } from "./pathParams";
import type { ActionSpec, ExtensionRegistration, QueryParamSpec, RouteSpec, UpstreamSpec } from "./types";

export const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"] as const;
export type HttpMethod = (typeof HTTP_METHODS)[number];

function newId(): string {
  return crypto.randomUUID();
}

export interface UpstreamDraft {
  id: string;
  key: string;
  type: "http" | "iotedge";
  base_url: string;
  health_path: string;
  version_field: string;
  expected_version: string;
  module_name: string;
  health_device_query: string;
}

export interface QueryParamDraft {
  id: string;
  name: string;
  type: "string" | "integer" | "number" | "boolean";
  required: boolean;
  description: string;
}

export interface RouteDraft {
  id: string;
  upstream: string;
  path: string;
  method: HttpMethod;
  summary: string;
  description: string;
  tags: string;
  deprecated: boolean;
  status_code: string;
  visibility: "public" | "internal";
  required_action: string;
  scoped: boolean;
  scope_param: string;
  scope_in: "path" | "query";
  upstream_path: string;
  body_ref: boolean;
  bodyText: string;
  exampleText: string;
  query_params: QueryParamDraft[];
  iotedge_operation: "direct_method" | "twin_read" | "twin_write";
  iotedge_method_name: string;
}

export interface ActionDraft {
  id: string;
  name: string;
  description: string;
}

export interface ExtensionFormDraft {
  name: string;
  description: string;
  upstreams: UpstreamDraft[];
  actions: ActionDraft[];
  routes: RouteDraft[];
}

export function emptyUpstream(): UpstreamDraft {
  return {
    id: newId(),
    key: "",
    type: "http",
    base_url: "",
    health_path: "/health",
    version_field: "version",
    expected_version: "",
    module_name: "",
    health_device_query: "",
  };
}

export function emptyAction(): ActionDraft {
  return { id: newId(), name: "", description: "" };
}

export function emptyQueryParam(): QueryParamDraft {
  return { id: newId(), name: "", type: "string", required: true, description: "" };
}

export function emptyRoute(defaultUpstreamKey = ""): RouteDraft {
  return {
    id: newId(),
    upstream: defaultUpstreamKey,
    path: "",
    method: "GET",
    summary: "",
    description: "",
    tags: "",
    deprecated: false,
    status_code: "200",
    visibility: "public",
    required_action: "",
    scoped: false,
    scope_param: "device_id",
    scope_in: "query",
    upstream_path: "",
    body_ref: false,
    bodyText: "",
    exampleText: "",
    query_params: [],
    iotedge_operation: "direct_method",
    iotedge_method_name: "",
  };
}

export function emptyDraft(): ExtensionFormDraft {
  return { name: "", description: "", upstreams: [], actions: [], routes: [] };
}

function upstreamToDraft(key: string, spec: UpstreamSpec): UpstreamDraft {
  if (spec.type === "http") {
    return {
      id: newId(),
      key,
      type: "http",
      base_url: spec.base_url,
      health_path: spec.health_path,
      version_field: spec.version_field,
      expected_version: spec.expected_version ?? "",
      module_name: "",
      health_device_query: "",
    };
  }
  return {
    id: newId(),
    key,
    type: "iotedge",
    base_url: "",
    health_path: "/health",
    version_field: "version",
    expected_version: "",
    module_name: spec.module_name,
    health_device_query: spec.health_device_query ?? "",
  };
}

function queryParamToDraft(qp: QueryParamSpec): QueryParamDraft {
  return { id: newId(), name: qp.name, type: qp.type, required: qp.required, description: qp.description ?? "" };
}

/** Fills in the same defaults the backend applies, since hand-written/imported manifests
 * routinely omit optional fields entirely rather than specifying their default value. */
function routeToDraft(route: RouteSpec): RouteDraft {
  return coerceScopeParam({
    id: newId(),
    upstream: route.upstream,
    path: route.path,
    method: route.method as HttpMethod,
    summary: route.summary ?? "",
    description: route.description ?? "",
    tags: (route.tags ?? []).join(", "),
    deprecated: route.deprecated ?? false,
    status_code: String(route.status_code ?? 200),
    visibility: route.visibility ?? "public",
    required_action: route.required_action ?? "",
    scoped: route.scoped ?? false,
    scope_param: route.scope_param ?? "device_id",
    scope_in: route.scope_in ?? "query",
    upstream_path: route.upstream_path ?? "",
    body_ref: route.body_ref ?? false,
    bodyText: route.body ? JSON.stringify(route.body, null, 2) : "",
    exampleText: route.example ? JSON.stringify(route.example, null, 2) : "",
    query_params: (route.query_params ?? []).map(queryParamToDraft),
    iotedge_operation: route.iotedge?.operation ?? "direct_method",
    iotedge_method_name: route.iotedge?.method_name ?? "",
  });
}

/** Prefills a draft from either a full ExtensionRegistration/ExtensionDetail (editing, or a
 * pasted/imported JSON manifest) - extra fields like `enabled` are simply ignored. */
export function draftFromRegistration(reg: ExtensionRegistration): ExtensionFormDraft {
  return {
    name: reg.name,
    description: reg.description ?? "",
    upstreams: Object.entries(reg.upstreams ?? {}).map(([key, spec]) => upstreamToDraft(key, spec)),
    actions: (reg.actions ?? []).map((a) => ({ id: newId(), name: a.name, description: a.description ?? "" })),
    routes: (reg.routes ?? []).map(routeToDraft),
  };
}

export interface DraftConversionResult {
  registration?: ExtensionRegistration;
  errors: string[];
}

function httpBaseUrlError(value: string): string | undefined {
  try {
    const url = new URL(value);
    if (!(["http:", "https:"] as string[]).includes(url.protocol) || !url.hostname) {
      return "must be an absolute HTTP or HTTPS URL";
    }
    if (url.username || url.password) return "must not contain credentials";
    if (url.search || url.hash) return "must not contain a query string or fragment";
  } catch {
    return "must be a valid HTTP or HTTPS URL";
  }
  return undefined;
}

function routePathError(value: string): string | undefined {
  if (!value.startsWith("/") || value.startsWith("//")) return "must start with exactly one '/'";
  if (value.includes("?") || value.includes("#")) return "must not contain a query string or fragment";
  return undefined;
}

/** Validates + converts a form draft into the wire ExtensionRegistration shape. Never
 * throws - collects every problem found so the caller can show them all at once. */
export function draftToRegistration(draft: ExtensionFormDraft): DraftConversionResult {
  const errors: string[] = [];

  const name = draft.name.trim();
  if (!name) errors.push("Extension name is required.");

  const upstreamKeys = new Set<string>();
  const upstreams: Record<string, UpstreamSpec> = {};
  for (const u of draft.upstreams) {
    const key = u.key.trim();
    if (!key) {
      errors.push("Every upstream needs a key.");
      continue;
    }
    if (upstreamKeys.has(key)) errors.push(`Duplicate upstream key "${key}".`);
    upstreamKeys.add(key);

    if (u.type === "http") {
      const baseUrl = u.base_url.trim();
      if (!baseUrl) {
        errors.push(`Upstream "${key}": base URL is required.`);
      } else {
        const urlError = httpBaseUrlError(baseUrl);
        if (urlError) errors.push(`Upstream "${key}": base URL ${urlError}.`);
      }
      upstreams[key] = {
        type: "http",
        base_url: baseUrl,
        health_path: u.health_path.trim() || "/health",
        version_field: u.version_field.trim() || "version",
        expected_version: u.expected_version.trim() || null,
      };
    } else {
      if (!u.module_name.trim()) errors.push(`Upstream "${key}": module name is required.`);
      upstreams[key] = {
        type: "iotedge",
        module_name: u.module_name.trim(),
        health_device_query: u.health_device_query.trim() || null,
      };
    }
  }

  const actions: ActionSpec[] = [];
  for (const a of draft.actions) {
    const actionName = a.name.trim();
    if (!actionName) {
      errors.push("Every action needs a name.");
      continue;
    }
    actions.push({ name: actionName, description: a.description.trim() });
  }

  const routes: RouteSpec[] = [];
  draft.routes.forEach((r, idx) => {
    const label = r.path.trim() ? `route "${r.method} ${r.path.trim()}"` : `route #${idx + 1}`;
    if (!r.upstream) {
      errors.push(`${label}: an upstream must be selected.`);
    }
    if (!r.path.trim()) {
      errors.push(`${label}: path is required.`);
    } else {
      const pathError = routePathError(r.path.trim());
      if (pathError) errors.push(`${label}: path ${pathError}.`);
    }
    if (!HTTP_METHODS.includes(r.method)) {
      errors.push(`${label}: unsupported HTTP method "${r.method}".`);
    }
    const statusCode = Number(r.status_code);
    if (!Number.isInteger(statusCode)) {
      errors.push(`${label}: status code must be a whole number.`);
    }

    let body: Record<string, unknown> | null = null;
    let example: Record<string, unknown> | null = null;
    if (!r.body_ref) {
      if (r.bodyText.trim()) {
        try {
          body = JSON.parse(r.bodyText);
        } catch {
          errors.push(`${label}: body is not valid JSON.`);
        }
      }
      if (r.exampleText.trim()) {
        try {
          example = JSON.parse(r.exampleText);
        } catch {
          errors.push(`${label}: example is not valid JSON.`);
        }
      }
    }

    const upstreamSpec = upstreams[r.upstream];
    const upstreamPath = upstreamSpec?.type === "http"
      ? r.upstream_path.trim() || r.path.trim()
      : null;
    if (upstreamPath) {
      const upstreamPathError = routePathError(upstreamPath);
      if (upstreamPathError) errors.push(`${label}: upstream path ${upstreamPathError}.`);
      const routeParams = new Set(pathParamNames(r.path));
      const missingParams = Array.from(new Set(pathParamNames(upstreamPath))).filter(
        (param) => !routeParams.has(param),
      );
      if (missingParams.length > 0) {
        errors.push(`${label}: upstream path uses unavailable placeholders: ${missingParams.join(", ")}.`);
      }
    }
    let iotedge: RouteSpec["iotedge"] = null;
    if (upstreamSpec?.type === "iotedge") {
      if (r.iotedge_operation === "direct_method" && !r.iotedge_method_name.trim()) {
        errors.push(`${label}: an iotedge direct_method route needs a method name.`);
      }
      iotedge = {
        operation: r.iotedge_operation,
        method_name: r.iotedge_operation === "direct_method" ? r.iotedge_method_name.trim() : null,
      };
    }

    routes.push({
      upstream: r.upstream,
      path: r.path.trim(),
      method: r.method,
      summary: r.summary.trim() || null,
      description: r.description.trim() || null,
      tags: r.tags.trim() ? r.tags.split(",").map((t) => t.trim()).filter(Boolean) : null,
      deprecated: r.deprecated,
      status_code: Number.isInteger(statusCode) ? statusCode : 200,
      query_params: r.query_params
        .filter((qp) => qp.name.trim())
        .map((qp) => ({ name: qp.name.trim(), type: qp.type, required: qp.required, description: qp.description.trim() || null })),
      body,
      example,
      body_ref: r.body_ref,
      visibility: r.visibility,
      required_action: r.required_action.trim() || null,
      scoped: r.scoped,
      scope_param: coerceScopeParam(r).scope_param.trim() || "device_id",
      scope_in: r.scope_in,
      upstream_path: upstreamPath,
      iotedge,
    });
  });

  if (errors.length > 0) return { errors };

  return {
    errors: [],
    registration: {
      schema_version: 1,
      name,
      description: draft.description.trim(),
      upstreams,
      actions,
      routes,
    },
  };
}
