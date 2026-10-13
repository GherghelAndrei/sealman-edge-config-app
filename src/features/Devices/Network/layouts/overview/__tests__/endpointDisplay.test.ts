import { describe, expect, it } from "vitest";
import { endpointTitle, roleFieldKey, titleFieldKeys } from "../endpointDisplay";

describe("roleFieldKey", () => {
  it("finds the key that carries a role", () => {
    expect(roleFieldKey({ addr: "ip", title: "name" }, "name")).toBe("title");
  });

  it("returns null without that role or without a mapping", () => {
    expect(roleFieldKey({ addr: "ip" }, "name")).toBeNull();
    expect(roleFieldKey(undefined, "ip")).toBeNull();
  });
});

describe("titleFieldKeys", () => {
  it("contains only the ip and name role fields", () => {
    expect([...titleFieldKeys({ addr: "ip", title: "name", other: "x" })].sort()).toEqual(["addr", "title"]);
  });
});

describe("endpointTitle", () => {
  it("is the name-role value when set", () => {
    expect(endpointTitle({ typeLabel: "PLC", name: "Press 1", ip: "10.0.0.1" })).toBe("Press 1");
  });

  it("falls back to the type label plus the ip-role value", () => {
    expect(endpointTitle({ typeLabel: "PLC", name: undefined, ip: "10.0.0.1" })).toBe("PLC · 10.0.0.1");
  });

  it("falls back to the type label alone without an IP", () => {
    expect(endpointTitle({ typeLabel: "Sensor" })).toBe("Sensor");
  });

  it("treats an empty name as no name", () => {
    expect(endpointTitle({ typeLabel: "PLC", name: "  ", ip: "10.0.0.1" })).toBe("PLC · 10.0.0.1");
  });

  it("is Unidentified without a type", () => {
    expect(endpointTitle({ typeLabel: null, ip: "10.0.0.9" })).toBe("Unidentified");
  });
});
