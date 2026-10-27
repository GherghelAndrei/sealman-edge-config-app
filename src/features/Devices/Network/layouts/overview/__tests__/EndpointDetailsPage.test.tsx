import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import EndpointDetailsPage from "../EndpointDetailsPage";

const mocks = vi.hoisted(() => ({
  endpoint: undefined as unknown,
  isLoading: false,
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
vi.mock("@/features/Extensions/slots/ExtensionSlot", () => ({
  default: (props: Record<string, unknown>) => <div data-testid="slot">{JSON.stringify(props)}</div>,
}));
vi.mock("@/features/Devices/Network/stores", () => ({
  useNetworkPageStore: (selector: (s: { deviceId: string }) => unknown) => selector({ deviceId: "dev-1" }),
}));
vi.mock("@/features/authorization/permissions/use-permissions", () => ({
  usePermissions: () => ({ hasPermission: mocks.hasPermission }),
}));
vi.mock("@/generated/edge-administration/hooks/endpoints/useGetEndpoint", () => ({
  default: () => ({ data: mocks.endpoint, isLoading: mocks.isLoading, isError: false, refetch: vi.fn() }),
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
    mocks.isLoading = false;
    mocks.hasPermission = true;
  });

  it("renders endpoint.details slot with ids and edit mode for writers", () => {
    renderPage();
    expect(JSON.parse(screen.getByTestId("slot").textContent!)).toEqual({
      name: "endpoint.details",
      context: { deviceId: "dev-1", endpointId: "e1", endpointTypeId: "t1", mode: "edit" },
    });
  });

  it("uses view mode without endpoint write", () => {
    mocks.hasPermission = false;
    renderPage();
    expect(JSON.parse(screen.getByTestId("slot").textContent!).context.mode).toBe("view");
  });

  it("renders no slot while loading", () => {
    mocks.endpoint = undefined;
    mocks.isLoading = true;
    renderPage();
    expect(screen.queryByTestId("slot")).toBeNull();
  });

  it("slot is placed after Instance Data and before Services", () => {
    renderPage();
    const slot = screen.getByTestId("slot");
    const instance = screen.getByRole("heading", { name: "Instance Data" });
    const services = screen.getByRole("heading", { name: "Services" });
    expect(instance.compareDocumentPosition(slot) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(slot.compareDocumentPosition(services) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
