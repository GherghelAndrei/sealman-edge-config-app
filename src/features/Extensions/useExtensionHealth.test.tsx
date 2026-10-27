import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode } from "react";
import { useExtensionHealth } from "./useExtensionHealth";
import { client } from "@/generated/edge-administration/api";

vi.mock("@/generated/edge-administration/api", () => ({
  client: {
    POST: vi.fn(),
  },
}));

const persisted = {
  widgets: {
    last_status: "healthy" as const,
    last_detail: null,
    last_checked_at: "2026-09-11T13:55:19.775633Z",
  },
};

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe("useExtensionHealth", () => {
  beforeEach(() => {
    vi.mocked(client.POST).mockReset();
  });

  it("shows persisted last_status immediately instead of spinning", () => {
    vi.mocked(client.POST).mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(
      () => useExtensionHealth("widget-service", true, persisted),
      { wrapper },
    );

    expect(result.current.rollup).toBe("healthy");
    expect(result.current.lastCheckedAt).toBe("2026-09-11T13:55:19.775633Z");
    expect(result.current.checkStartedAt).toBeUndefined();
    expect(result.current.error).toBeUndefined();
  });

  it("replaces persisted status with a live check result", async () => {
    vi.mocked(client.POST).mockResolvedValue({
      data: {
        name: "widget-service",
        upstreams: {
          widgets: { last_status: "unhealthy", last_detail: "down", last_checked_at: "now" },
        },
      },
      error: undefined,
    });

    const { result } = renderHook(
      () => useExtensionHealth("widget-service", true, persisted),
      { wrapper },
    );

    await waitFor(() => expect(result.current.rollup).toBe("unhealthy"));
    expect(result.current.upstreams?.widgets.last_detail).toBe("down");
  });

  it("does not POST while the extension is disabled", () => {
    renderHook(() => useExtensionHealth("widget-service", false, persisted), { wrapper });
    expect(client.POST).not.toHaveBeenCalled();
  });
});
