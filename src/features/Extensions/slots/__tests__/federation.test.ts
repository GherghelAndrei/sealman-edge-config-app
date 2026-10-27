import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import pkg from "../../../../../package.json";
import rqPkg from "@tanstack/react-query/package.json";
import type { ExtensionContribution } from "../contract";

const registerRemotesMock = vi.fn();
const loadRemoteMock = vi.fn();
const createInstanceMock = vi.fn();

vi.mock("@module-federation/runtime", () => ({
  createInstance: (...args: unknown[]) => createInstanceMock(...args),
}));

const c: ExtensionContribution = {
  extension: "acme",
  remoteName: "acme",
  entry: "http://localhost:4174/ext-ui/acme/remoteEntry.js",
  module: "./EndpointPanel",
  label: "Acme",
};

const Panel = () => null;

async function loadFederation() {
  vi.resetModules();
  return import("../federation");
}

describe("federation", () => {
  beforeEach(() => {
    createInstanceMock.mockReset();
    registerRemotesMock.mockReset();
    loadRemoteMock.mockReset();
    createInstanceMock.mockReturnValue({
      registerRemotes: registerRemotesMock,
      loadRemote: loadRemoteMock,
    });
    loadRemoteMock.mockResolvedValue({ default: Panel });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("initialises once with shared singletons", async () => {
    const { loadExtensionPanel } = await loadFederation();
    await loadExtensionPanel(c);
    await loadExtensionPanel(c);
    expect(createInstanceMock).toHaveBeenCalledTimes(1);
    const options = createInstanceMock.mock.calls[0][0];
    expect(options.name).toBe("sealman");
    const shared = options.shared;
    expect(shared.react.shareConfig).toMatchObject({
      singleton: true,
      requiredVersion: pkg.dependencies.react,
    });
    expect(shared["react-dom"].shareConfig.requiredVersion).toBe(pkg.dependencies["react-dom"]);
    expect(shared["@tanstack/react-query"].shareConfig.requiredVersion).toBe(
      pkg.dependencies["@tanstack/react-query"]
    );
    expect(Object.keys(shared)).toEqual(["react", "react-dom", "@tanstack/react-query"]);
    expect(shared["@tanstack/react-query"].version).toBe(rqPkg.version);
    for (const entry of Object.values<{ version: string; lib: () => unknown }>(shared)) {
      expect(entry.version).toMatch(/^\d+\.\d+\.\d+/);
      expect(typeof entry.lib()).toBe("object");
    }
  });

  it("registers a remote once and loads acme/EndpointPanel", async () => {
    const { loadExtensionPanel } = await loadFederation();
    const component = await loadExtensionPanel(c);
    await loadExtensionPanel(c);
    expect(component).toBe(Panel);
    expect(registerRemotesMock).toHaveBeenCalledTimes(1);
    expect(registerRemotesMock).toHaveBeenCalledWith([
      { name: "acme", entry: c.entry, type: "module" },
    ]);
    expect(loadRemoteMock).toHaveBeenCalledWith("acme/EndpointPanel");
  });

  it("force re-registers a remote whose entry url changed", async () => {
    const { loadExtensionPanel } = await loadFederation();
    await loadExtensionPanel(c);
    const moved = { ...c, entry: "http://localhost:4174/ext-ui/acme/v2/remoteEntry.js" };
    await loadExtensionPanel(moved);
    expect(registerRemotesMock).toHaveBeenLastCalledWith(
      [{ name: "acme", entry: moved.entry, type: "module" }],
      { force: true }
    );
  });

  it("registers once for concurrent loads of the same remote", async () => {
    const { loadExtensionPanel } = await loadFederation();
    await Promise.all([loadExtensionPanel(c), loadExtensionPanel(c)]);
    expect(registerRemotesMock).toHaveBeenCalledTimes(1);
  });

  it("rejects when module has no default export", async () => {
    loadRemoteMock.mockResolvedValue({});
    const { loadExtensionPanel } = await loadFederation();
    await expect(loadExtensionPanel(c)).rejects.toThrow(/default export/);
  });

  it("rejects when the remote resolves to nothing", async () => {
    loadRemoteMock.mockResolvedValue(null);
    const { loadExtensionPanel } = await loadFederation();
    await expect(loadExtensionPanel(c)).rejects.toThrow(/default export/);
  });

  it("can retry after a failed load without registering twice", async () => {
    loadRemoteMock.mockRejectedValueOnce(new Error("boom"));
    const { loadExtensionPanel } = await loadFederation();
    await expect(loadExtensionPanel(c)).rejects.toThrow("boom");
    await expect(loadExtensionPanel(c)).resolves.toBe(Panel);
    expect(registerRemotesMock).toHaveBeenCalledTimes(1);
    expect(loadRemoteMock).toHaveBeenCalledTimes(2);
  });

  it("test_load_times_out", async () => {
    vi.useFakeTimers();
    loadRemoteMock.mockReturnValue(new Promise(() => {}));
    const { loadExtensionPanel } = await loadFederation();
    const p = loadExtensionPanel(c, 10_000);
    const assertion = expect(p).rejects.toThrow("Timed out loading acme");
    await vi.advanceTimersByTimeAsync(10_000);
    await assertion;
  });

  it("clears the timer when the load settles", async () => {
    vi.useFakeTimers();
    const { loadExtensionPanel } = await loadFederation();
    await loadExtensionPanel(c, 10_000);
    expect(vi.getTimerCount()).toBe(0);
  });
});
