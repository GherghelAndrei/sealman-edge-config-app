import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { PanelProps } from "../sdk";
import type { Contribution } from "../useExtensionUi";

const uiMock = vi.fn();
const loadMock = vi.fn();
const panelProps: PanelProps<Record<string, unknown>>[] = [];

vi.mock("../useExtensionUi", () => ({ useContributions: () => uiMock() }));
vi.mock("../federation", () => ({ loadExtensionPanel: (...args: unknown[]) => loadMock(...args) }));
vi.mock("../useOutletUser", () => ({ useOutletUser: () => ({ id: "u", name: "n" }) }));
vi.mock("@/auth", () => ({ getAccessToken: vi.fn().mockResolvedValue("t") }));
vi.mock("react-toastify", () => ({ toast: { info: vi.fn(), success: vi.fn(), warning: vi.fn(), error: vi.fn() } }));

import RoutedExtensionPanel from "../RoutedExtensionPanel";
import { resetExtensionPanelCache } from "../lazyPanel";

const mockUi = (contributions: Partial<Contribution>[]) =>
  uiMock.mockReturnValue({
    isLoading: false,
    contributions: contributions.map((c) => ({
      extension: "acme",
      remoteName: "acme",
      entry: "/remoteEntry.js",
      ...c,
    })),
  });

function renderAt(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route
          path="/devices/:deviceId/*"
          element={
            <Routes>
              <Route
                path="x/:ext/:path/*"
                element={<RoutedExtensionPanel target="device" placement="tab" context={{ deviceId: "d1" }} />}
              />
            </Routes>
          }
        />
      </Routes>
    </MemoryRouter>
  );
}

describe("RoutedExtensionPanel", () => {
  beforeEach(() => {
    resetExtensionPanelCache();
    panelProps.length = 0;
    uiMock.mockReset();
    loadMock.mockReset();
    loadMock.mockResolvedValue((props: PanelProps<Record<string, unknown>>) => {
      panelProps.push(props);
      return <div>panel body</div>;
    });
  });

  it("renders a device tab panel with its subPath", async () => {
    mockUi([{ target: "device", placement: "tab", module: "./Tab", label: "Acme Tab", path: "acme-tab" }]);
    renderAt("/devices/d1/x/acme/acme-tab/details/7");
    await screen.findByText("panel body");
    expect(panelProps.at(-1)?.context).toMatchObject({ deviceId: "d1", subPath: "details/7" });
  });

  it("shows not found for an unknown extension route", async () => {
    mockUi([]);
    renderAt("/devices/d1/x/gone/tab");
    expect(await screen.findByText("This extension page is not available.")).toBeTruthy();
  });
});
