import { describe, expect, it } from "vitest";
import type { MappedEndpoint, MappedPort } from "@/generated/edge-administration/hooks/network/usePostNetworkOverview";
import { endpointListKey, mergeConfiguredEndpoints, mergeEndpointsByIp, portListKey } from "../overviewMerge";

function endpoint(overrides: Partial<MappedEndpoint>): MappedEndpoint {
  return { status: "unknown", source: "configured", ports: [], ...overrides };
}

function port(overrides: Partial<MappedPort>): MappedPort {
  return { status: "unknown", source: "configured", ...overrides };
}

describe("endpointListKey", () => {
  it("uses endpoint_id when there is one", () => {
    expect(endpointListKey(endpoint({ endpoint_id: "e1", ip: "10.0.0.1" }))).toBe("id:e1");
  });

  it("falls back to the IP for scan results without an endpoint", () => {
    expect(endpointListKey(endpoint({ ip: "10.0.0.1", source: "unidentified" }))).toBe("ip:10.0.0.1");
  });
});

describe("portListKey", () => {
  it("uses the port number when there is one", () => {
    expect(portListKey(port({ port: 502, service_id: "s1" }))).toBe("port:502");
  });

  it("falls back to the service_id for services without a port value", () => {
    expect(portListKey(port({ service_id: "s1" }))).toBe("service:s1");
  });
});

describe("mergeConfiguredEndpoints", () => {
  it("keeps two configured endpoints without IP apart", () => {
    const merged = mergeConfiguredEndpoints([], [endpoint({ endpoint_id: "a" }), endpoint({ endpoint_id: "b" })]);
    expect(merged.map((e) => e.endpoint_id).sort()).toEqual(["a", "b"]);
  });

  it("lets the live entry win and unions ports, including ports without a number", () => {
    const configured = endpoint({
      endpoint_id: "a",
      status: "offline",
      ports: [port({ service_id: "s1" }), port({ port: 21, status: "offline", service_id: "s2" })],
    });
    const live = endpoint({ endpoint_id: "a", status: "online", ports: [port({ port: 21, status: "online", service_id: "s2" })] });
    const [merged] = mergeConfiguredEndpoints([live], [configured]);
    expect(merged.status).toBe("online");
    expect(merged.ports.map(portListKey).sort()).toEqual(["port:21", "service:s1"]);
    expect(merged.ports.find((p) => p.port === 21)?.status).toBe("online");
  });
});

describe("mergeEndpointsByIp", () => {
  it("keeps endpoints without IP apart instead of collapsing them under one key", () => {
    const merged = mergeEndpointsByIp([endpoint({ endpoint_id: "a" }), endpoint({ endpoint_id: "b" })], []);
    expect(merged).toHaveLength(2);
  });

  it("still merges the same host from both scans by IP", () => {
    const merged = mergeEndpointsByIp(
      [endpoint({ ip: "10.0.0.1", source: "unidentified", ports: [port({ port: 80 })] })],
      [endpoint({ ip: "10.0.0.1", source: "unidentified", ports: [port({ port: 8080 })] })],
    );
    expect(merged).toHaveLength(1);
    expect(merged[0].ports.map((p) => p.port).sort()).toEqual([80, 8080]);
  });
});
