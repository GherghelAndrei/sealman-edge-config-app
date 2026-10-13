import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import AssignEndpointDialog from "../AssignEndpointDialog";

const mocks = vi.hoisted(() => ({
  types: [
    { type_id: "with-ip", label: "With IP", description: null, fields: { addr: { type: "string", ui: "input", required: false, changeable: true, show_in_list: true, default: null, label: "Address" } }, mapping: { addr: "ip" } },
    {
      type_id: "no-ip",
      label: "No IP",
      description: null,
      fields: {
        serial: { type: "string", ui: "input", required: false, changeable: true, show_in_list: true, default: "UNKNOWN", label: "Serial" },
        location: { type: "string", ui: "input", required: false, changeable: true, show_in_list: true, default: null, label: "Location" },
      },
      mapping: {},
    },
  ] as unknown[],
  postEndpoint: vi.fn(),
  updateEndpoint: vi.fn(),
  deleteEndpoint: vi.fn(),
}));

vi.mock("@/generated/edge-administration/hooks/endpoint_types/useGetEndpointTypes", () => ({
  default: () => ({ data: mocks.types }),
}));
vi.mock("@/generated/edge-administration/hooks/endpoints/usePostEndpoint", () => ({ usePostEndpoint: () => ({ postEndpoint: mocks.postEndpoint, isPending: false }) }));
vi.mock("@/generated/edge-administration/hooks/endpoints/useUpdateEndpoint", () => ({ useUpdateEndpoint: () => ({ updateEndpoint: mocks.updateEndpoint, isPending: false }) }));
vi.mock("@/generated/edge-administration/hooks/endpoints/useDeleteEndpoint", () => ({ useDeleteEndpoint: () => ({ deleteEndpoint: mocks.deleteEndpoint, isPending: false }) }));

describe("AssignEndpointDialog", () => {
  beforeEach(() => {
    mocks.postEndpoint.mockReset().mockResolvedValue(undefined);
    mocks.updateEndpoint.mockReset().mockResolvedValue(undefined);
    mocks.deleteEndpoint.mockReset().mockResolvedValue(undefined);
  });

  it("pre-fills the scanned IP into the ip-role field", () => {
    render(<AssignEndpointDialog open onOpenChange={() => {}} deviceId="d" ip="10.0.0.9" defaultTypeId="with-ip" onCreated={() => {}} />);
    expect(screen.getByDisplayValue("10.0.0.9")).toBeInTheDocument();
  });

  it("does not pre-fill the scanned IP when the type has no ip role", () => {
    render(<AssignEndpointDialog open onOpenChange={() => {}} deviceId="d" ip="10.0.0.9" defaultTypeId="no-ip" onCreated={() => {}} />);
    expect(screen.queryByDisplayValue("10.0.0.9")).not.toBeInTheDocument();
  });
});
