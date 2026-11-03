import { act, fireEvent, render, screen } from "@testing-library/react";
import { focusManager, onlineManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import VpnPage from "./VpnPage";
import { queryClient } from "@/config/queryConfig";

const mocks = vi.hoisted(() => ({ user: "user-a", get: vi.fn() }));
vi.mock("@/auth", () => ({ useAuth: () => ({ isAuthenticated: true, user: { sub: mocks.user } }) }));
vi.mock("@/generated/edge-administration/api", () => ({ client: { GET: mocks.get } }));
vi.mock("@/generated/edge-administration/hooks/endpoint_types/useGetEndpointTypes", () => ({ default: () => ({ data: [] }) }));
vi.mock("@/features/Devices/Network/smart_ems/layouts/Authorization", () => ({ Authorization: () => <div>VPN authorization</div> }));
vi.mock("@/features/Devices/Network/smart_ems/layouts/EdgeDeviceVPNCard", () => ({ EdgeDeviceVPNCard: () => <div>Gateway VPN</div> }));

describe("VPN endpoint access", () => {
  let client: QueryClient;
  const tree = (deviceId = "device-a") => <QueryClientProvider client={client}><VpnPage deviceId={deviceId} /></QueryClientProvider>;
  const flush = async (ms = 50) => { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); };
  beforeEach(() => {
    vi.useFakeTimers();
    mocks.user = "user-a";
    mocks.get.mockReset().mockResolvedValue({ data: { endpoints: [{ ip: "10.0.0.1", source: "configured", endpoint_id: "one" }] } });
    client = new QueryClient({ defaultOptions: queryClient.getDefaultOptions() });
  });
  afterEach(() => { client.clear(); vi.useRealTimers(); });

  it("hides stale endpoints on 403 without hiding gateway controls or retrying automatically", async () => {
    render(tree());
    await flush();
    expect(screen.getByText("10.0.0.1")).toBeInTheDocument();
    mocks.get.mockRejectedValue(Object.assign(new Error("Denied"), { statusCode: 403 }));
    await act(async () => { await client.invalidateQueries(); });
    await flush();
    expect(screen.getByText("Not permitted")).toBeInTheDocument();
    expect(screen.queryByText("10.0.0.1")).not.toBeInTheDocument();
    expect(screen.getByText("Gateway VPN")).toBeInTheDocument();
    expect(screen.getByText("VPN authorization")).toBeInTheDocument();
    const calls = mocks.get.mock.calls.length;
    await act(async () => {
      focusManager.setFocused(false); focusManager.setFocused(true);
      onlineManager.setOnline(false); onlineManager.setOnline(true);
      await client.invalidateQueries();
    });
    await flush(15000);
    expect(mocks.get).toHaveBeenCalledTimes(calls);
    mocks.get.mockResolvedValue({ data: { endpoints: [] } });
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await flush();
    expect(screen.queryByText("Not permitted")).not.toBeInTheDocument();
    expect(screen.getByText("No endpoints with an IP address available.")).toBeInTheDocument();
  });

  it("does not reuse another account/device's cached endpoints", async () => {
    const { rerender } = render(tree());
    await flush();
    mocks.user = "user-b";
    mocks.get.mockImplementation(() => new Promise(() => {}));
    rerender(tree("device-b"));
    await flush();
    expect(screen.queryByText("10.0.0.1")).not.toBeInTheDocument();
    expect(screen.getByText("Gateway VPN")).toBeInTheDocument();
  });
});
