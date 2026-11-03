import { describe, expect, it, vi } from "vitest"
import useSelectedEndpoint from "./SelectedEndpoint"

vi.mock("../api/networkMeta", () => ({
  getEndpointTypes: () => [
    { name: "Without description", description: null, defaultIP: "192.168.1.1" },
    { name: "With description", description: "Type description", defaultIP: "192.168.1.2" },
  ],
  getServices: () => [],
}))

describe("selected endpoint description", () => {
  it.each([
    ["192.168.1.1", undefined, undefined],
    ["192.168.1.2", undefined, "Type description"],
    ["192.168.1.2", "", "Type description"],
    ["192.168.1.2", "Saved description", "Saved description"],
    ["192.168.1.3", undefined, undefined],
  ])("normalizes the description for %s with saved value %s", (ip, description, expected) => {
    useSelectedEndpoint.getState().setSelectedEndpointState({
      name: "Endpoint",
      description,
      serviceNames: {},
    }, ip)

    expect(useSelectedEndpoint.getState().description).toBe(expected)
  })
})
