import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

vi.mock("@/features/PlatformTypes/TypesManager", () => ({ default: ({ title }: { title: string }) => <div>{title}</div> }));
vi.mock("@/features/PlatformTypes/DeviceTableColumnsCard", () => ({ default: () => null }));
vi.mock("@/features/PlatformTypes/DefaultScanPortsCard", () => ({ default: () => null }));
vi.mock("@/generated/edge-administration/hooks/device_types/useGetDeviceTypes", () => ({ default: () => ({ data: [], isLoading: false }) }));
vi.mock("@/generated/edge-administration/hooks/endpoint_types/useGetEndpointTypes", () => ({ default: () => ({ data: [], isLoading: false }) }));
vi.mock("@/generated/edge-administration/hooks/service_types/useGetServiceTypes", () => ({ default: () => ({ data: [], isLoading: false }) }));
vi.mock("@/generated/edge-administration/hooks/device_types/usePostDeviceType", () => ({ usePostDeviceType: () => ({}) }));
vi.mock("@/generated/edge-administration/hooks/device_types/useUpdateDeviceType", () => ({ useUpdateDeviceType: () => ({}) }));
vi.mock("@/generated/edge-administration/hooks/device_types/useDeleteDeviceType", () => ({ useDeleteDeviceType: () => ({}) }));
vi.mock("@/generated/edge-administration/hooks/endpoint_types/usePostEndpointType", () => ({ usePostEndpointType: () => ({}) }));
vi.mock("@/generated/edge-administration/hooks/endpoint_types/useUpdateEndpointType", () => ({ useUpdateEndpointType: () => ({}) }));
vi.mock("@/generated/edge-administration/hooks/endpoint_types/useDeleteEndpointType", () => ({ useDeleteEndpointType: () => ({}) }));
vi.mock("@/generated/edge-administration/hooks/service_types/usePostServiceType", () => ({ usePostServiceType: () => ({}) }));
vi.mock("@/generated/edge-administration/hooks/service_types/useUpdateServiceType", () => ({ useUpdateServiceType: () => ({}) }));
vi.mock("@/generated/edge-administration/hooks/service_types/useDeleteServiceType", () => ({ useDeleteServiceType: () => ({}) }));
vi.mock("@/features/Extensions/slots/ExtensionSlot", () => ({
  default: ({ name, context, renderFrame }: { name: string; context: object; renderFrame?: (l: string, p: ReactNode) => ReactNode }) => (
    <div data-testid="slot">
      {`${name}:${JSON.stringify(context)}`}
      {renderFrame?.("Acme Panel", <span>acme body</span>)}
    </div>
  ),
}));

import PlatformTypesSettings from "../PlatformTypesSettings";

describe("PlatformTypesSettings extension slot", () => {
  it("renders the settings slot in a settings card", () => {
    render(<PlatformTypesSettings />);
    expect(screen.getByTestId("slot")).toHaveTextContent("settings:{}");
    const card = screen.getByText("acme body").closest("div.bg-card");
    expect(card).not.toBeNull();
    expect(card).toHaveTextContent("Acme Panel");
  });
});
