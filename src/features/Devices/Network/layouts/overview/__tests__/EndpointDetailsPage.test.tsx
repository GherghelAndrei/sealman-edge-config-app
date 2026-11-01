import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import EndpointDetailsPage from "../EndpointDetailsPage";

const mocks = vi.hoisted(() => ({
  endpoint: undefined as unknown,
  hasPermission: true,
}));

const endpointFixture = {
  endpoint_id: "e1",
  type_id: "t1",
  type_label: "Type One",
  type_description: null,
  endpoint_data: {},
};

vi.mock("@tanstack/react-query", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-query")>()),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));
vi.mock("@/features/Extensions/outlets/ExtensionOutlet", () => ({
  default: (props: Record<string, unknown>) => <div data-testid="slot">{JSON.stringify(props)}</div>,
}));
vi.mock("@/features/Extensions/outlets/useOutletUser", () => ({ useOutletUser: () => ({ id: "u1", name: "User" }) }));
vi.mock("@/generated/edge-administration/hooks/device_metadata/useGetDeviceMetadata", () => ({
  default: () => ({ data: { typeId: "dt1" } }),
}));
vi.mock("@/features/Devices/Network/stores", () => ({
  useNetworkPageStore: (selector: (s: { deviceId: string }) => unknown) => selector({ deviceId: "dev-1" }),
}));
vi.mock("@/features/authorization/permissions/use-permissions", () => ({
  usePermissions: () => ({ hasPermission: mocks.hasPermission }),
}));
vi.mock("@/generated/edge-administration/hooks/endpoints/useGetEndpoint", () => ({
  default: () => ({ data: mocks.endpoint, isLoading: false, isError: false, refetch: vi.fn() }),
}));
vi.mock("@/generated/edge-administration/hooks/endpoint_types/useGetEndpointTypes", () => ({
  default: () => ({ data: [{ type_id: "t1", label: "Type One", description: null, fields: {}, mapping: {} }] }),
}));
vi.mock("@/generated/edge-administration/hooks/services/useGetServices", () => ({
  default: () => ({ data: [], refetch: vi.fn() }),
}));
vi.mock("@/generated/edge-administration/hooks/endpoints/useUpdateEndpoint", () => ({
  useUpdateEndpoint: () => ({ updateEndpoint: vi.fn(), isPending: false }),
}));
vi.mock("@/generated/edge-administration/hooks/endpoints/useDeleteEndpoint", () => ({
  useDeleteEndpoint: () => ({ deleteEndpoint: vi.fn(), isPending: false }),
}));
vi.mock("../AssignServiceDialog", () => ({ default: () => null }));
vi.mock("../ConfirmDeleteDialog", () => ({ default: () => null }));
vi.mock("../ReassignEndpointDialog", () => ({ default: () => null }));

const renderPage = () =>
  render(<EndpointDetailsPage endpointId="e1" onBack={() => {}} onOpenServiceDetails={() => {}} onUpdated={() => {}} />);

describe("EndpointDetailsPage endpoint.details slot", () => {
  beforeEach(() => {
    mocks.endpoint = endpointFixture;
    mocks.hasPermission = true;
  });

  it("renders the endpoint section outlet with ids and edit rights for writers", () => {
    renderPage();
    expect(JSON.parse(screen.getByTestId("slot").textContent!)).toEqual({
      target: "endpoint",
      placement: "section",
      context: {
        user: { id: "u1", name: "User" },
        deviceId: "dev-1",
        deviceTypeId: "dt1",
        endpointId: "e1",
        endpointTypeId: "t1",
        canEdit: true,
      },
    });
  });

  it("passes canEdit false without endpoint write", () => {
    mocks.hasPermission = false;
    renderPage();
    expect(JSON.parse(screen.getByTestId("slot").textContent!).context.canEdit).toBe(false);
  });
});
