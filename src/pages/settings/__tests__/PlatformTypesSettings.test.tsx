import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import useGetExtensionFields from "@/generated/edge-administration/hooks/extension_fields/useGetExtensionFields";
import PlatformTypesSettings from "../PlatformTypesSettings";

const emptyQuery = { data: [], isLoading: false, isError: false, refetch: vi.fn() };

vi.mock("@/features/PlatformTypes/TypesManager", () => ({ default: () => null }));
vi.mock("@/features/PlatformTypes/DeviceTableColumnsCard", () => ({ default: () => null }));
vi.mock("@/features/PlatformTypes/DefaultScanPortsCard", () => ({ default: () => null }));
vi.mock("@/features/PlatformTypes/ExtensionFieldsCard", () => ({
  default: ({ fieldSet }: { fieldSet: { extension: string } }) => <div>card {fieldSet.extension}</div>,
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

  it("renders a card only for enabled extensions", () => {
    vi.mocked(useGetExtensionFields).mockReturnValue({
      ...emptyQuery,
      data: [fieldSet("inventory", true), fieldSet("archive", false)],
    } as unknown as ReturnType<typeof useGetExtensionFields>);
    render(<PlatformTypesSettings />);
    expect(screen.getByText("card inventory")).toBeInTheDocument();
    expect(screen.queryByText("card archive")).not.toBeInTheDocument();
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
