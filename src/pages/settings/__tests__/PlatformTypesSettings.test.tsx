import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import useGetExtensionFields from "@/generated/edge-administration/hooks/extension_fields/useGetExtensionFields";
import PlatformTypesSettings from "../PlatformTypesSettings";

const emptyQuery = { data: [], isLoading: false, isError: false, refetch: vi.fn() };

vi.mock("@/features/PlatformTypes/TypesManager", () => ({ default: () => null }));
vi.mock("@/features/PlatformTypes/DeviceTableColumnsCard", () => ({ default: () => null }));
vi.mock("@/features/PlatformTypes/DefaultScanPortsCard", () => ({ default: () => null }));
vi.mock("@/features/PlatformTypes/ExtensionFieldsCard", () => ({
  default: ({ fieldSets }: { fieldSets: { extension: string }[] }) => (
    <div data-testid="extension-fields-card">card {fieldSets.map((s) => s.extension).join(",")}</div>
  ),
}));
vi.mock("@/generated/edge-administration/hooks/device_types/useGetDeviceTypes", () => ({ default: () => emptyQuery }));
vi.mock("@/generated/edge-administration/hooks/device_types/usePostDeviceType", () => ({ usePostDeviceType: () => ({}) }));
vi.mock("@/generated/edge-administration/hooks/device_types/useUpdateDeviceType", () => ({ useUpdateDeviceType: () => ({}) }));
vi.mock("@/generated/edge-administration/hooks/device_types/useDeleteDeviceType", () => ({ useDeleteDeviceType: () => ({}) }));
vi.mock("@/generated/edge-administration/hooks/endpoint_types/useGetEndpointTypes", () => ({ default: () => emptyQuery }));
vi.mock("@/generated/edge-administration/hooks/endpoint_types/usePostEndpointType", () => ({ usePostEndpointType: () => ({}) }));
vi.mock("@/generated/edge-administration/hooks/endpoint_types/useUpdateEndpointType", () => ({ useUpdateEndpointType: () => ({}) }));
vi.mock("@/generated/edge-administration/hooks/endpoint_types/useDeleteEndpointType", () => ({ useDeleteEndpointType: () => ({}) }));
vi.mock("@/generated/edge-administration/hooks/service_types/useGetServiceTypes", () => ({ default: () => emptyQuery }));
vi.mock("@/generated/edge-administration/hooks/service_types/usePostServiceType", () => ({ usePostServiceType: () => ({}) }));
vi.mock("@/generated/edge-administration/hooks/service_types/useUpdateServiceType", () => ({ useUpdateServiceType: () => ({}) }));
vi.mock("@/generated/edge-administration/hooks/service_types/useDeleteServiceType", () => ({ useDeleteServiceType: () => ({}) }));
vi.mock("@/generated/edge-administration/hooks/extension_fields/useGetExtensionFields", () => ({ default: vi.fn() }));
vi.mock("@/generated/edge-administration/hooks/extension_fields/useApplyExtensionFields", () => ({
  useApplyExtensionFields: () => ({ applyExtensionFields: vi.fn(), isPending: false }),
}));

const fieldSet = (extension: string, enabled: boolean) => ({ extension, enabled, fields: {}, applied: {} });

describe("PlatformTypesSettings extension field cards", () => {
  beforeEach(() => {
    vi.mocked(useGetExtensionFields).mockReset();
  });

  it("renders one card holding only the enabled extensions", () => {
    vi.mocked(useGetExtensionFields).mockReturnValue({
      ...emptyQuery,
      data: [fieldSet("inventory", true), fieldSet("archive", false), fieldSet("warranty", true)],
    } as unknown as ReturnType<typeof useGetExtensionFields>);
    render(<PlatformTypesSettings />);
    expect(screen.getAllByTestId("extension-fields-card")).toHaveLength(1);
    expect(screen.getByText("card inventory,warranty")).toBeInTheDocument();
  });

  it("renders no card when no extension is enabled", () => {
    vi.mocked(useGetExtensionFields).mockReturnValue({
      ...emptyQuery,
      data: [fieldSet("archive", false)],
    } as unknown as ReturnType<typeof useGetExtensionFields>);
    render(<PlatformTypesSettings />);
    expect(screen.queryByTestId("extension-fields-card")).not.toBeInTheDocument();
  });

  it("renders no cards when the extension fields query fails", () => {
    vi.mocked(useGetExtensionFields).mockReturnValue({
      ...emptyQuery,
      isError: true,
      data: [fieldSet("inventory", true)],
    } as unknown as ReturnType<typeof useGetExtensionFields>);
    render(<PlatformTypesSettings />);
    expect(screen.queryByText(/^card /)).not.toBeInTheDocument();
  });
});
