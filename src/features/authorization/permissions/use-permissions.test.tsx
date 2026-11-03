import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePermissions } from "./use-permissions";

const mocks = vi.hoisted(() => ({ user: "user-a", getPermissions: vi.fn() }));
vi.mock("@/auth", () => ({ useAuth: () => ({ isAuthenticated: true, user: { sub: mocks.user, iss: "test" } }) }));
vi.mock("@/api/edgeConfig/edgeConfigApi", () => ({ edgeConfigApi: { getPermissions: mocks.getPermissions } }));

describe("effective-permission isolation", () => {
  let client: QueryClient;
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  beforeEach(() => {
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    mocks.user = "user-a";
    mocks.getPermissions.mockReset().mockResolvedValue({ permissions: ["extension.read"] });
  });
  afterEach(() => { client.clear(); });

  it("does not reuse another account's permission grant", async () => {
    const { result, rerender } = renderHook(() => usePermissions({ permissionKey: "extension.read" }), { wrapper });
    await waitFor(() => expect(result.current.hasPermission).toBe(true));
    mocks.user = "user-b";
    mocks.getPermissions.mockImplementation(() => new Promise(() => {}));
    rerender();
    expect(result.current.hasPermission).toBe(false);
    expect(result.current.isLoading).toBe(true);
  });

  it("fails closed when a refresh errors despite a previously cached grant", async () => {
    const { result } = renderHook(() => usePermissions({ permissionKey: "extension.read" }), { wrapper });
    await waitFor(() => expect(result.current.hasPermission).toBe(true));
    mocks.getPermissions.mockRejectedValue(new Error("Permission lookup failed"));
    await act(async () => { await client.invalidateQueries(); });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.hasPermission).toBe(false);
    expect(result.current.error?.message).toBe("Permission lookup failed");
  });

  it("aborts an in-flight permission request on an account change", async () => {
    mocks.getPermissions.mockImplementation(() => new Promise(() => {}));
    const { rerender } = renderHook(() => usePermissions({ permissionKey: "extension.read" }), { wrapper });
    await waitFor(() => expect(mocks.getPermissions).toHaveBeenCalledTimes(1));
    const signal: AbortSignal = mocks.getPermissions.mock.calls[0][1];
    mocks.user = "user-b";
    rerender();
    expect(signal.aborted).toBe(true);
  });
});
