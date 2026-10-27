import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";

const enabledFetch = vi.hoisted(() => vi.fn());
const extensionApi = vi.hoisted(() => vi.fn());
const enabledOptions = vi.hoisted(() => vi.fn());

vi.mock("@/generated/edge-administration/api", () => ({
  edgeApi: {
    useQuery: (method: string, path: string, init: unknown, options: Record<string, unknown>) => {
      enabledOptions(method, path, init, options);
      return useQuery({ queryKey: [method, path], queryFn: () => enabledFetch(), ...options });
    },
  },
}));
vi.mock("../createExtensionApi", () => ({ createExtensionApi: () => extensionApi }));

import { useExtensionContributions } from "../useExtensionContributions";
import { EXTENSION_SLOTS } from "../slots";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const acmeUi = {
  contractVersion: 1,
  entry: "/ext-ui/acme/remoteEntry.js",
  remoteName: "acme",
  slots: [
    { slot: "endpoint.details", module: "./EndpointPanel", label: "Acme Mapping" },
    { slot: "settings", module: "./SettingsPanel", label: "Acme Settings" },
  ],
};

const betaUi = {
  contractVersion: 1,
  entry: "/ext-ui/beta/remoteEntry.js",
  remoteName: "beta_ui",
  slots: [{ slot: "endpoint.details", module: "./Panel", label: "Beta" }],
};

let uiByName: Record<string, () => Response | Promise<Response>>;

function makeWrapper(qc = new QueryClient()) {
  return ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

async function contributionsFor(slot: Parameters<typeof useExtensionContributions>[0]) {
  const { result } = renderHook(() => useExtensionContributions(slot), { wrapper: makeWrapper() });
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  return result.current.contributions;
}

describe("useExtensionContributions", () => {
  beforeEach(() => {
    enabledFetch.mockReset();
    extensionApi.mockReset();
    enabledOptions.mockReset();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    uiByName = { acme: () => json(acmeUi), beta: () => json(betaUi) };
    extensionApi.mockImplementation(async (path: string) => {
      const name = path.split("/")[1];
      const respond = uiByName[name];
      return respond ? respond() : json({ message: "Not found" }, 404);
    });
  });

  it("queries the enabled list with a 5 minute stale time and no retry", async () => {
    enabledFetch.mockResolvedValue([]);
    await contributionsFor(EXTENSION_SLOTS.settings.name);
    expect(enabledOptions).toHaveBeenCalledWith(
      "get",
      "/extensions/enabled",
      expect.anything(),
      expect.objectContaining({ staleTime: 300_000, retry: false })
    );
  });

  it("returns the contributions of the slot, ordered by extension name", async () => {
    enabledFetch.mockResolvedValue([{ name: "beta" }, { name: "acme" }]);
    const contributions = await contributionsFor(EXTENSION_SLOTS.endpointDetails.name);
    expect(extensionApi).toHaveBeenCalledWith("/acme/ui");
    expect(extensionApi).toHaveBeenCalledWith("/beta/ui");
    expect(contributions).toEqual([
      {
        extension: "acme",
        remoteName: "acme",
        entry: "/ext-ui/acme/remoteEntry.js",
        module: "./EndpointPanel",
        label: "Acme Mapping",
      },
      { extension: "beta", remoteName: "beta_ui", entry: "/ext-ui/beta/remoteEntry.js", module: "./Panel", label: "Beta" },
    ]);
  });

  it("filters by slot", async () => {
    enabledFetch.mockResolvedValue([{ name: "beta" }, { name: "acme" }]);
    const contributions = await contributionsFor(EXTENSION_SLOTS.settings.name);
    expect(contributions.map((c) => [c.extension, c.module])).toEqual([["acme", "./SettingsPanel"]]);
  });

  it("is loading while descriptors are pending", async () => {
    enabledFetch.mockResolvedValue([{ name: "acme" }]);
    let release: (r: Response) => void = () => {};
    uiByName.acme = () => new Promise<Response>((r) => (release = r));
    const { result } = renderHook(() => useExtensionContributions(EXTENSION_SLOTS.settings.name), {
      wrapper: makeWrapper(),
    });
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(extensionApi).toHaveBeenCalled());
    expect(result.current.isLoading).toBe(true);
    release(json(acmeUi));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.contributions).toHaveLength(1);
  });

  it("ignores an extension without a /ui route", async () => {
    enabledFetch.mockResolvedValue([{ name: "acme" }, { name: "plain" }]);
    const contributions = await contributionsFor(EXTENSION_SLOTS.endpointDetails.name);
    expect(extensionApi).toHaveBeenCalledWith("/plain/ui");
    expect(contributions.map((c) => c.extension)).toEqual(["acme"]);
  });

  it("ignores network errors and invalid JSON", async () => {
    enabledFetch.mockResolvedValue([{ name: "acme" }, { name: "beta" }]);
    uiByName.acme = () => {
      throw new TypeError("Failed to fetch");
    };
    uiByName.beta = () => new Response("<html>", { status: 200 });
    expect(await contributionsFor(EXTENSION_SLOTS.endpointDetails.name)).toEqual([]);
    expect(console.warn).toHaveBeenCalled();
  });

  it("returns nothing when the enabled list fails", async () => {
    enabledFetch.mockRejectedValue(new Error("403"));
    expect(await contributionsFor(EXTENSION_SLOTS.endpointDetails.name)).toEqual([]);
    expect(extensionApi).not.toHaveBeenCalled();
  });

  it.each([
    ["wrong contract version", { ...acmeUi, contractVersion: 2 }],
    ["protocol-relative entry", { ...acmeUi, entry: "//evil.example/x" }],
    ["absolute entry", { ...acmeUi, entry: "https://evil.example/remoteEntry.js" }],
    ["relative entry", { ...acmeUi, entry: "ext-ui/acme/remoteEntry.js" }],
    ["backslash entry", { ...acmeUi, entry: "/\\evil.example/x" }],
    ["whitespace entry", { ...acmeUi, entry: "/ext ui/remoteEntry.js" }],
    ["query in entry", { ...acmeUi, entry: "/ext-ui/remoteEntry.js?x=1" }],
    ["fragment in entry", { ...acmeUi, entry: "/ext-ui/remoteEntry.js#x" }],
    ["non-string entry", { ...acmeUi, entry: 5 }],
    ["invalid remoteName", { ...acmeUi, remoteName: "acme-ui" }],
    ["remoteName starting with digit", { ...acmeUi, remoteName: "1acme" }],
    ["slots not an array", { ...acmeUi, slots: {} }],
    ["descriptor not an object", ["x"]],
    ["null descriptor", null],
  ])("skips a descriptor with %s", async (_, descriptor) => {
    enabledFetch.mockResolvedValue([{ name: "acme" }, { name: "beta" }]);
    uiByName.acme = () => json(descriptor);
    const contributions = await contributionsFor(EXTENSION_SLOTS.endpointDetails.name);
    expect(contributions.map((c) => c.extension)).toEqual(["beta"]);
  });

  it("skips invalid slot items but keeps the valid ones", async () => {
    enabledFetch.mockResolvedValue([{ name: "acme" }]);
    uiByName.acme = () =>
      json({
        ...acmeUi,
        slots: [
          null,
          { slot: "endpoint.details", module: "../escape", label: "Bad module" },
          { slot: "endpoint.details", module: "EndpointPanel", label: "No dot slash" },
          { slot: "endpoint.details", module: "./Panel?x", label: "Bad char" },
          { slot: "endpoint.details", module: "./Panel", label: "" },
          { slot: "endpoint.details", module: "./Panel", label: "x".repeat(65) },
          { slot: 7, module: "./Panel", label: "Bad slot" },
          { slot: "endpoint.details", module: "./sub/Good_Panel-1", label: "x".repeat(64) },
        ],
      });
    const contributions = await contributionsFor(EXTENSION_SLOTS.endpointDetails.name);
    expect(contributions.map((c) => c.module)).toEqual(["./sub/Good_Panel-1"]);
  });

  it("fetches each descriptor once across slots", async () => {
    enabledFetch.mockResolvedValue([{ name: "acme" }]);
    const wrapper = makeWrapper();
    const a = renderHook(() => useExtensionContributions(EXTENSION_SLOTS.endpointDetails.name), { wrapper });
    const b = renderHook(() => useExtensionContributions(EXTENSION_SLOTS.settings.name), { wrapper });
    await waitFor(() => expect(a.result.current.contributions).toHaveLength(1));
    await waitFor(() => expect(b.result.current.contributions).toHaveLength(1));
    renderHook(() => useExtensionContributions(EXTENSION_SLOTS.settings.name), { wrapper });
    expect(extensionApi.mock.calls.filter(([p]) => p === "/acme/ui")).toHaveLength(1);
    expect(enabledFetch).toHaveBeenCalledTimes(1);
  });
});
