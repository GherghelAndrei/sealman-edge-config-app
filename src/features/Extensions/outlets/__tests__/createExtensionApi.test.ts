import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({ getAccessToken: vi.fn() }));

import { createExtensionApi } from "../createExtensionApi";

describe("createExtensionApi", () => {
  const fetchImpl = vi.fn();
  const make = (baseUrl = "https://api.test") =>
    createExtensionApi({
      getToken: async () => "tok",
      baseUrl,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

  beforeEach(() => {
    fetchImpl.mockReset();
    fetchImpl.mockResolvedValue(new Response("{}", { status: 200 }));
  });

  it("allows any core path", async () => {
    const api = make("https://api.test/");
    await api("/devices/d1/endpoints?x=1");
    await api("/acme/a");
    expect(fetchImpl.mock.calls[0][0]).toBe("https://api.test/devices/d1/endpoints?x=1");
    expect(fetchImpl.mock.calls[1][0]).toBe("https://api.test/acme/a");
  });

  it("adds bearer token and keeps caller headers", async () => {
    const api = make();
    await api("/acme/a", { method: "PUT", body: "{}", headers: { "Content-Type": "application/json" } });
    const init = fetchImpl.mock.calls[0][1];
    expect(init.method).toBe("PUT");
    expect(init.body).toBe("{}");
    const headers = new Headers(init.headers);
    expect(headers.get("Authorization")).toBe("Bearer tok");
    expect(headers.get("Content-Type")).toBe("application/json");
  });

  it.each(["", "/api"])("keeps relative base %j on the page origin", async (base) => {
    await make(base)("/acme/a");
    expect(fetchImpl.mock.calls[0][0]).toBe(`${base}/acme/a`);
  });

  it.each(["//evil.example/x", "/\\evil.example"])("rejects %s with an empty base", async (p) => {
    await expect(make("")(p)).rejects.toThrow("Extension path not allowed");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it.each([undefined, null, 5, {}, "acme/a", "https://evil.com/x", "", "//evil.example/x", "/\\\\evil.example", "/a\\b"])(
    "rejects non-string or relative path %s",
    async (p) => {
      await expect(make()(p as unknown as string)).rejects.toThrow("Extension path not allowed");
      expect(fetchImpl).not.toHaveBeenCalled();
    }
  );
});
