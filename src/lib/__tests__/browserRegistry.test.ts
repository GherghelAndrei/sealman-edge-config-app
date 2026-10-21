import { describe, expect, it } from "vitest";
import { resolveBrowseTarget } from "../browserRegistry";

describe("resolveBrowseTarget", () => {
  it("returns ip and port when both are set", () => {
    expect(resolveBrowseTarget("10.0.0.1", 4840)).toEqual({ ip: "10.0.0.1", port: 4840 });
  });

  it("returns null without an ip", () => {
    expect(resolveBrowseTarget(undefined, 4840)).toBeNull();
    expect(resolveBrowseTarget("", 4840)).toBeNull();
  });

  it("returns null without a port", () => {
    expect(resolveBrowseTarget("10.0.0.1", null)).toBeNull();
  });

  it("accepts port 0", () => {
    expect(resolveBrowseTarget("10.0.0.1", 0)).toEqual({ ip: "10.0.0.1", port: 0 });
  });
});
