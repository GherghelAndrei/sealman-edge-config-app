import type { components } from "@/generated/edge-administration/types";

export type ExtensionDetail = components["schemas"]["ExtensionDetail"];
export type ExtensionRegistration = components["schemas"]["ExtensionRegistration"];
export type HttpUpstreamSpec = components["schemas"]["HttpUpstreamSpec"];
export type IotedgeUpstreamSpec = components["schemas"]["IotedgeUpstreamSpec"];
export type UpstreamSpec = HttpUpstreamSpec | IotedgeUpstreamSpec;
export type RouteSpec = components["schemas"]["RouteSpec"];
export type RouteDetail = components["schemas"]["RouteDetail"];
export type ActionSpec = components["schemas"]["ActionSpec"];
export type QueryParamSpec = components["schemas"]["QueryParamSpec"];
export type IotEdgeCallSpec = components["schemas"]["IotEdgeCallSpec"];
export type UpstreamHealthStatus = components["schemas"]["UpstreamHealthStatus"];
export type ValidationMode = NonNullable<RouteDetail["validation_mode"]>;

export type RollupHealth = "unknown" | "healthy" | "unhealthy";

/** Extension-level health rollup, mirrors the API doc's "unhealthy if any upstream is
 * unhealthy, else unknown if any is unknown, else healthy" rule. */
export function rollupHealth(upstreams: Record<string, UpstreamHealthStatus> | undefined): RollupHealth {
  const statuses = Object.values(upstreams ?? {}).map((u) => u.last_status);
  if (statuses.length === 0) return "unknown";
  if (statuses.some((s) => s === "unhealthy")) return "unhealthy";
  if (statuses.some((s) => s === "unknown")) return "unknown";
  return "healthy";
}

/** Most recent `last_checked_at` across upstreams - used so a rolled-up list dot can
 * still say how current the status is. */
export function latestCheckedAt(
  upstreams: Record<string, UpstreamHealthStatus> | undefined,
): string | undefined {
  let latest: { iso: string; ms: number } | undefined;
  for (const upstream of Object.values(upstreams ?? {})) {
    const iso = upstream.last_checked_at;
    if (!iso) continue;
    const ms = new Date(iso).getTime();
    if (Number.isNaN(ms)) continue;
    if (!latest || ms > latest.ms) latest = { iso, ms };
  }
  return latest?.iso;
}
