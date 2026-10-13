import type { MappedEndpoint, MappedPort } from "@/generated/edge-administration/hooks/network/usePostNetworkOverview";

/**
 * Stable key for an overview row and for its accordion selection: configured endpoints by
 * `endpoint_id` (several can share an IP, and some have none), scan-only entries by IP.
 */
export function endpointListKey(endpoint: Pick<MappedEndpoint, "endpoint_id" | "ip">): string {
  if (endpoint.endpoint_id) return `id:${endpoint.endpoint_id}`;
  return `ip:${endpoint.ip ?? ""}`;
}

/** Stable key for a port row: the port number, or the service_id for a service without a port value. */
export function portListKey(port: Pick<MappedPort, "port" | "service_id">): string {
  if (port.port != null) return `port:${port.port}`;
  return `service:${port.service_id ?? ""}`;
}

function mergePorts(base: MappedPort[], preferred: MappedPort[]): MappedPort[] {
  const ports = new Map<string, MappedPort>();
  for (const port of base) ports.set(portListKey(port), port);
  for (const port of preferred) ports.set(portListKey(port), port);
  return [...ports.values()];
}

// A host found by both the baseline and the custom scan is the same host. Configured endpoints
// merge by endpoint_id (several can share an IP and are listed separately); only scan-only
// entries, which have no endpoint_id, merge by IP.
function scanMergeKey(endpoint: MappedEndpoint): string {
  return endpointListKey(endpoint);
}

/**
 * `primary` (the recurring baseline scan) wins on endpoint-level data for entries it also covers,
 * since it's the freshest. Its port list only reflects the catalog ports, so ports are unioned per
 * entry; within a shared port, primary still wins.
 */
export function mergeEndpointsByIp(primary: MappedEndpoint[], extras: MappedEndpoint[]): MappedEndpoint[] {
  const byKey = new Map<string, MappedEndpoint>();
  for (const endpoint of extras) byKey.set(scanMergeKey(endpoint), endpoint);
  for (const endpoint of primary) {
    const key = scanMergeKey(endpoint);
    const extra = byKey.get(key);
    byKey.set(key, extra ? { ...endpoint, ports: mergePorts(extra.ports, endpoint.ports) } : endpoint);
  }
  return [...byKey.values()];
}

/**
 * Configured endpoints (last known state from the database) merged under the live data, keyed by
 * `endpointListKey`, so endpoints that share an IP, or have none, never collapse into one row.
 */
export function mergeConfiguredEndpoints(primary: MappedEndpoint[], configured: MappedEndpoint[]): MappedEndpoint[] {
  const byKey = new Map<string, MappedEndpoint>();
  for (const endpoint of configured) byKey.set(endpointListKey(endpoint), endpoint);
  for (const endpoint of primary) {
    const key = endpointListKey(endpoint);
    const match = byKey.get(key);
    byKey.set(key, match ? { ...endpoint, ports: mergePorts(match.ports, endpoint.ports) } : endpoint);
  }
  return [...byKey.values()];
}
