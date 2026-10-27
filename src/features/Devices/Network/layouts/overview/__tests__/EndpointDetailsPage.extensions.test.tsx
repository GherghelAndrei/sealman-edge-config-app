import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import EndpointDetailsPage from "../EndpointDetailsPage";

const mocks = vi.hoisted(() => ({
  endpoint: undefined as unknown,
  refetch: vi.fn(),
  updateEndpoint: vi.fn(),
  invalidateQueries: vi.fn(),
  slotProps: [] as Array<Record<string, unknown>>,
}));

const resolved = (data: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(data).map(([k, value]) => [k, { value, field: null }]));

const endpointWith = (data: Record<string, unknown>) => ({
  endpoint_id: "e1",
  type_id: "t1",
  type_label: "Type One",
  type_description: null,
  endpoint_data: resolved(data),
});

vi.mock("@tanstack/react-query", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-query")>()),
  useQueryClient: () => ({ invalidateQueries: mocks.invalidateQueries }),
}));
vi.mock("@/features/Extensions/slots/ExtensionSlot", () => ({
  default: (props: { onDataChanged?: () => void; renderFrame?: (label: string, panel: React.ReactNode) => React.ReactNode }) => {
    mocks.slotProps.push(props as Record<string, unknown>);
    return (
    <>
      <button onClick={() => props.onDataChanged?.()}>panel-changed</button>
      {props.renderFrame?.("Acme Panel", <span>acme body</span>)}
    </>
    );
  },
}));
vi.mock("@/features/Devices/Network/stores", () => ({
  useNetworkPageStore: (selector: (s: { deviceId: string }) => unknown) => selector({ deviceId: "dev-1" }),
}));
vi.mock("@/features/authorization/permissions/use-permissions", () => ({
  usePermissions: () => ({ hasPermission: true }),
}));
vi.mock("@/generated/edge-administration/hooks/endpoints/useGetEndpoint", () => ({
  default: () => ({ data: mocks.endpoint, isLoading: false, isError: false, refetch: mocks.refetch }),
}));
vi.mock("@/generated/edge-administration/hooks/endpoint_types/useGetEndpointTypes", () => ({
  default: () => ({ data: [{ type_id: "t1", label: "Type One", description: null, fields: {}, mapping: {} }] }),
}));
vi.mock("@/generated/edge-administration/hooks/services/useGetServices", () => ({
  default: () => ({ data: [], refetch: vi.fn() }),
}));
vi.mock("@/generated/edge-administration/hooks/endpoints/useUpdateEndpoint", () => ({
  useUpdateEndpoint: () => ({ updateEndpoint: mocks.updateEndpoint, isPending: false }),
}));
vi.mock("@/generated/edge-administration/hooks/endpoints/useDeleteEndpoint", () => ({
  useDeleteEndpoint: () => ({ deleteEndpoint: vi.fn(), isPending: false }),
}));
vi.mock("../AssignServiceDialog", () => ({ default: () => null }));
vi.mock("../ConfirmDeleteDialog", () => ({ default: () => null }));
vi.mock("../ReassignEndpointDialog", () => ({ default: () => null }));
vi.mock("../TypeFieldsForm", () => ({ default: () => null }));
vi.mock("../CustomFieldsEditor", () => ({
  default: (props: { customValues: Record<string, unknown>; onChange: (k: string, v: unknown) => void }) => (
    <div>
      <div data-testid="values">{JSON.stringify(props.customValues)}</div>
      <button onClick={() => props.onChange("name", "edited")}>edit-name</button>
    </div>
  ),
}));

const onUpdated = vi.fn();
const renderPage = () =>
  render(<EndpointDetailsPage endpointId="e1" onBack={() => {}} onOpenServiceDetails={() => {}} onUpdated={onUpdated} />);

const shownValues = () => JSON.parse(screen.getByTestId("values").textContent!);

describe("EndpointDetailsPage reacts to extension data changes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.slotProps.length = 0;
    mocks.endpoint = endpointWith({ name: "orig", ext_id: "x1" });
    mocks.updateEndpoint.mockResolvedValue({});
  });

  it("frames extension panels like the other endpoint cards", () => {
    renderPage();
    const heading = screen.getByRole("heading", { name: "Acme Panel" });
    expect(heading.closest("div.border.rounded-lg")).toHaveTextContent("acme body");
  });

  it("replaces untouched keys after panel change", async () => {
    mocks.refetch.mockResolvedValue({ data: endpointWith({ name: "orig", ext_id: "x2", added: "a" }) });
    renderPage();
    fireEvent.click(screen.getByText("panel-changed"));
    await waitFor(() => expect(shownValues()).toEqual({ name: "orig", ext_id: "x2", added: "a" }));
  });

  it("keeps unsaved user edits after panel change", async () => {
    mocks.refetch.mockResolvedValue({ data: endpointWith({ name: "server-name", ext_id: "x2" }) });
    renderPage();
    fireEvent.click(screen.getByText("edit-name"));
    fireEvent.click(screen.getByText("panel-changed"));
    await waitFor(() => expect(shownValues().ext_id).toBe("x2"));
    expect(shownValues().name).toBe("edited");
  });

  it("keeps panel changes when saving the host form afterwards", async () => {
    mocks.refetch.mockResolvedValue({ data: endpointWith({ name: "orig" }) });
    renderPage();
    fireEvent.click(screen.getByText("panel-changed"));
    await waitFor(() => expect(shownValues()).toEqual({ name: "orig" }));
    fireEvent.click(screen.getByText("edit-name"));
    fireEvent.click(screen.getByText("Save Changes"));
    await waitFor(() => expect(mocks.updateEndpoint).toHaveBeenCalled());
    const body = mocks.updateEndpoint.mock.calls[0][0].body.endpoint_data;
    expect(body).toEqual({ name: "edited" });
    expect("ext_id" in body).toBe(false);
  });

  it("calls onUpdated after a successful panel change merge", async () => {
    mocks.refetch.mockResolvedValue({ data: endpointWith({ name: "orig", ext_id: "x2" }) });
    renderPage();
    fireEvent.click(screen.getByText("panel-changed"));
    await waitFor(() => expect(onUpdated).toHaveBeenCalledTimes(1));
  });

  it("keeps onDataChanged identity across host re-renders", () => {
    renderPage();
    fireEvent.click(screen.getByText("edit-name"));
    const handlers = mocks.slotProps.map((p) => p.onDataChanged);
    expect(handlers.length).toBeGreaterThan(1);
    expect(new Set(handlers).size).toBe(1);
  });

  it("invalidates device metadata query", async () => {
    mocks.refetch.mockResolvedValue({ data: endpointWith({ name: "orig", ext_id: "x1" }) });
    renderPage();
    fireEvent.click(screen.getByText("panel-changed"));
    await waitFor(() =>
      expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["get", "/{device}/metadata"] }),
    );
  });

  it("invalidates device metadata even when refetch fails", async () => {
    mocks.refetch.mockResolvedValue({ isError: true, data: endpointWith({ name: "orig", ext_id: "x1" }) });
    renderPage();
    fireEvent.click(screen.getByText("panel-changed"));
    await waitFor(() =>
      expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["get", "/{device}/metadata"] }),
    );
  });

  it("does not merge on refetch error", async () => {
    mocks.refetch.mockResolvedValue({ isError: true, data: endpointWith({ name: "other", ext_id: "x2" }) });
    renderPage();
    fireEvent.click(screen.getByText("panel-changed"));
    await waitFor(() => expect(mocks.invalidateQueries).toHaveBeenCalled());
    expect(shownValues()).toEqual({ name: "orig", ext_id: "x1" });
  });

  it("ignores a refetch result for another endpoint", async () => {
    mocks.refetch.mockResolvedValue({ data: { ...endpointWith({ name: "other", ext_id: "x9" }), endpoint_id: "e2" } });
    renderPage();
    fireEvent.click(screen.getByText("panel-changed"));
    await waitFor(() => expect(mocks.invalidateQueries).toHaveBeenCalled());
    expect(shownValues()).toEqual({ name: "orig", ext_id: "x1" });
  });

  it("keeps a panel-changed value when saving afterwards", async () => {
    mocks.refetch.mockResolvedValue({ data: endpointWith({ name: "orig", ext_id: "x2" }) });
    renderPage();
    fireEvent.click(screen.getByText("panel-changed"));
    await waitFor(() => expect(shownValues().ext_id).toBe("x2"));
    fireEvent.click(screen.getByText("edit-name"));
    fireEvent.click(screen.getByText("Save Changes"));
    await waitFor(() => expect(mocks.updateEndpoint).toHaveBeenCalled());
    expect(mocks.updateEndpoint.mock.calls[0][0].body.endpoint_data).toEqual({ name: "edited", ext_id: "x2" });
  });
});
