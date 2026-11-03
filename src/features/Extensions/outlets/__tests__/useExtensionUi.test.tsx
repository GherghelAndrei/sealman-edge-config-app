import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";

const uiFetch = vi.hoisted(() => vi.fn());

vi.mock("@/generated/edge-administration/api", () => ({
  edgeApi: {
    useQuery: (method: string, path: string, _init: unknown, options: Record<string, unknown>) =>
      useQuery({ queryKey: [method, path], queryFn: () => uiFetch(), ...options }),
  },
}));

import { matchesWhen, useContributions } from "../useExtensionUi";

const valid = (name: string) => ({
  name,
  contractVersion: 1,
  entry: `/ext-ui/${name}/remoteEntry.js`,
  remoteName: name,
  contributions: [{ target: "endpoint", placement: "section", module: "./EndpointPanel", label: name }],
});
const ctx = { endpointTypeId: "t1" };

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
);

describe("useExtensionUi", () => {
  beforeEach(() => {
    uiFetch.mockReset();
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("drops an invalid ui entry and keeps the others", async () => {
    uiFetch.mockResolvedValue([
      valid("crm"),
      { ...valid("bad"), entry: "https://evil/x.js" },
      { ...valid("old"), contractVersion: 2 },
    ]);
    const { result } = renderHook(() => useContributions("endpoint", "section", ctx), { wrapper });
    await waitFor(() => expect(result.current.contributions.map((c) => c.extension)).toEqual(["crm"]));
  });

  it("sorts contributions by label, then extension", async () => {
    const one = (name: string, label: string) => ({
      ...valid(name),
      contributions: [{ target: "endpoint", placement: "section", module: "./EndpointPanel", label }],
    });
    uiFetch.mockResolvedValue([one("b", "B"), one("zeta", "Same"), one("a", "A"), one("alpha", "Same")]);
    const { result } = renderHook(() => useContributions("endpoint", "section", ctx), { wrapper });
    await waitFor(() =>
      expect(result.current.contributions.map((c) => `${c.label}|${c.extension}`)).toEqual([
        "A|a",
        "B|b",
        "Same|alpha",
        "Same|zeta",
      ])
    );
  });

  it("matches when against the context", () => {
    expect(matchesWhen({ moduleType: ["opcua"] }, { moduleType: "opcua" })).toBe(true);
    expect(matchesWhen({ moduleType: ["opcua"] }, { moduleType: "modbus" })).toBe(false);
    expect(matchesWhen({ endpointTypeId: ["t1"] }, {})).toBe(false);
    expect(matchesWhen(undefined, { anything: "x" })).toBe(true);
  });
});
