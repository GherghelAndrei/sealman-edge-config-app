import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ExtensionContribution, ExtensionPanelProps } from "../contract";

const contributionsMock = vi.fn();
const loadMock = vi.fn();
const toastMock = vi.hoisted(() => ({ info: vi.fn(), success: vi.fn(), warning: vi.fn(), error: vi.fn() }));

vi.mock("../useExtensionContributions", () => ({
  useExtensionContributions: (...args: unknown[]) => contributionsMock(...args),
}));
vi.mock("../federation", () => ({ loadExtensionPanel: (...args: unknown[]) => loadMock(...args) }));
vi.mock("@/auth", () => ({ getAccessToken: vi.fn().mockResolvedValue("secret-token") }));
vi.mock("react-toastify", () => ({ toast: toastMock }));

import ExtensionSlot from "../ExtensionSlot";
import { resetExtensionPanelCache } from "../lazyPanel";

const c: ExtensionContribution = {
  extension: "acme",
  remoteName: "acme",
  entry: "http://localhost/remoteEntry.js",
  module: "./EndpointPanel",
  label: "Acme Panel",
};

const received = vi.fn<(props: ExtensionPanelProps) => void>();
const seen = {
  get props(): ExtensionPanelProps | undefined {
    return received.mock.calls.at(-1)?.[0];
  },
};
const Panel = (props: ExtensionPanelProps) => {
  received(props);
  return <div>panel body</div>;
};

function setup(
  ui: Partial<React.ComponentProps<typeof ExtensionSlot>> = {},
  extra?: React.ReactNode
) {
  const qc = new QueryClient();
  return render(
    <QueryClientProvider client={qc}>
      {extra}
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- tests switch slots via `ui` */}
      <ExtensionSlot<any> name="endpoint.details" context={{ deviceId: "d1", endpointId: "e1", endpointTypeId: "t1", mode: "view" }} {...ui} />
    </QueryClientProvider>
  );
}

describe("ExtensionSlot", () => {
  beforeEach(() => {
    resetExtensionPanelCache();
    received.mockClear();
    contributionsMock.mockReset();
    loadMock.mockReset();
    Object.values(toastMock).forEach((f) => f.mockReset());
    contributionsMock.mockReturnValue({ contributions: [c], isLoading: false });
    loadMock.mockResolvedValue(Panel);
  });

  it("renders heading and panel", async () => {
    setup();
    expect(screen.getByRole("heading", { name: "Acme Panel" })).toBeTruthy();
    expect(await screen.findByText("panel body")).toBeTruthy();
    expect(contributionsMock).toHaveBeenCalledWith("endpoint.details");
  });

  it("renders nothing when catalog empty", () => {
    contributionsMock.mockReturnValue({ contributions: [], isLoading: false });
    const { container } = setup();
    expect(container.firstChild).toBeNull();
  });

  it("test_fallback_when_loader_rejects", async () => {
    loadMock.mockRejectedValue(new Error("Timed out"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    setup({}, <p>page</p>);
    expect(await screen.findByText("Acme Panel unavailable")).toBeTruthy();
    expect(screen.getByText("page")).toBeTruthy();
  });

  it("test_fallback_when_panel_throws", async () => {
    loadMock.mockResolvedValue(() => {
      throw new Error("render fail");
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
    setup({}, <p>page</p>);
    expect(await screen.findByText("Acme Panel unavailable")).toBeTruthy();
    expect(screen.getByText("page")).toBeTruthy();
  });

  it("passes contract props without the token", async () => {
    setup();
    await screen.findByText("panel body");
    const props = seen.props!;
    expect(props.contractVersion).toBe(1);
    expect(props.slot).toBe("endpoint.details");
    expect(props.context).toEqual({ deviceId: "d1", endpointId: "e1", endpointTypeId: "t1", mode: "view" });
    expect(typeof props.api).toBe("function");
    expect(Object.keys(props)).not.toContain("getAccessToken");
    expect(JSON.stringify(props)).not.toContain("secret-token");
  });

  it("passes onDataChanged to the panel", async () => {
    const onDataChanged = vi.fn();
    setup({ onDataChanged });
    await screen.findByText("panel body");
    seen.props!.onDataChanged();
    expect(onDataChanged).toHaveBeenCalledTimes(1);
  });

  it("defaults onDataChanged to a no-op", async () => {
    setup();
    await screen.findByText("panel body");
    expect(() => seen.props!.onDataChanged()).not.toThrow();
  });

  it("renders settings slot without device", async () => {
    setup({ name: "settings", context: {} });
    expect(await screen.findByText("panel body")).toBeTruthy();
    expect(contributionsMock).toHaveBeenCalledWith("settings");
    expect(seen.props!.slot).toBe("settings");
    expect(seen.props!.context).toEqual({});
  });

  it("notify maps severity to toast", async () => {
    setup();
    await screen.findByText("panel body");
    seen.props!.notify({ message: "hi", severity: "warning" });
    expect(toastMock.warning).toHaveBeenCalledWith("hi");
  });

  it("unknown severity falls back to toast.info", async () => {
    setup();
    await screen.findByText("panel body");
    seen.props!.notify({ message: "x", severity: "constructor" as never });
    expect(toastMock.info).toHaveBeenCalledWith("x");
  });

  it("props keep identity across a parent re-render", async () => {
    const onDataChanged = vi.fn();
    const el = () => (
      <QueryClientProvider client={new QueryClient()}>
        <ExtensionSlot name="endpoint.details" context={{ deviceId: "d1", endpointId: "e1", endpointTypeId: "t1", mode: "view" }} onDataChanged={onDataChanged} />
      </QueryClientProvider>
    );
    const { rerender } = render(el());
    await screen.findByText("panel body");
    const first = seen.props!;
    rerender(el());
    const last = seen.props!;
    expect(last.context).toBe(first.context);
    expect(last.notify).toBe(first.notify);
    expect(last.onDataChanged).toBe(first.onDataChanged);
    expect(last.api).toBe(first.api);
  });

  it("wraps each contribution in the page's frame when given", async () => {
    setup({
      renderFrame: (label, panel) => (
        <div data-testid="frame">
          <h4>{label}</h4>
          {panel}
        </div>
      ),
    });
    expect(await screen.findByText("panel body")).toBeTruthy();
    expect(screen.getByTestId("frame")).toHaveTextContent("Acme Panel");
    expect(screen.queryByRole("heading", { level: 3, name: "Acme Panel" })).toBeNull();
  });

  it("loads the panel once and does not re-suspend in a loop", async () => {
    // A real async loader: each call returns a fresh pending promise, as loadRemote does.
    loadMock.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve(Panel), 5)));
    setup();
    expect(await screen.findByText("panel body")).toBeTruthy();
    await new Promise((r) => setTimeout(r, 50));
    expect(loadMock).toHaveBeenCalledTimes(1);
  });

  it("shows the same panels whatever the device", async () => {
    setup({ context: { deviceId: "other", endpointId: "e1", endpointTypeId: "t1", mode: "view" } });
    expect(await screen.findByText("panel body")).toBeTruthy();
    expect(contributionsMock).toHaveBeenCalledWith("endpoint.details");
    expect(seen.props!.slot === "endpoint.details" && seen.props!.context.deviceId).toBe("other");
  });

  it("retries a failed panel when the endpoint changes", async () => {
    loadMock.mockRejectedValue(new Error("nope"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const qc = new QueryClient();
    const ui = (endpointId: string) => (
      <QueryClientProvider client={qc}>
        <ExtensionSlot
          name="endpoint.details"
          context={{ deviceId: "d1", endpointId, endpointTypeId: "t1", mode: "view" }}
        />
      </QueryClientProvider>
    );
    const { rerender } = render(ui("e1"));
    expect(await screen.findByText("Acme Panel unavailable")).toBeTruthy();
    loadMock.mockResolvedValue(Panel);
    rerender(ui("e2"));
    expect(await screen.findByText("panel body")).toBeTruthy();
  });
});
