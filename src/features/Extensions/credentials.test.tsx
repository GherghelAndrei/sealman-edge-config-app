import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Outlet, Route, Routes } from "react-router-dom";
import { focusManager, onlineManager, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DeviceKeysCard from "./DeviceKeysCard";
import ExtensionAccess from "./ExtensionAccess";
import ExtensionDetail from "./ExtensionDetail";
import RegisterExtensionPage from "./RegisterExtensionPage";
import SettingsLayout from "@/pages/settings/SettingsLayout";
import { queryClient } from "@/config/queryConfig";
import type { ExtensionFormDraft } from "./extensionFormTypes";

const mocks = vi.hoisted(() => {
  const fetch = vi.fn();
  return {
    fetch, user: "user-a", grants: new Set<string>(), loading: false, permissionsError: false,
    notify: vi.fn(), requests: [] as { method: string; path: string; body: unknown }[],
    keys: [] as { device_id: string; module_id?: string | null }[], denied: false,
  };
});
vi.mock("openapi-fetch", async (importOriginal) => {
  const { default: createClient } = await importOriginal<typeof import("openapi-fetch")>();
  return {
    default: (options: Parameters<typeof createClient>[0]) => createClient({ ...options, baseUrl: "http://api.test", fetch: mocks.fetch }),
  };
});
vi.mock("@/auth", () => ({
  useAuth: () => ({ isAuthenticated: true, user: { sub: mocks.user, iss: "test" } }),
  getAccessToken: async () => "test-access-token",
}));
vi.mock("@/features/authorization/permissions/use-permissions", () => ({
  usePermissions: ({ permissionKey }: { permissionKey: string }) => ({
    hasPermission: mocks.grants.has(permissionKey), isLoading: mocks.loading, isError: mocks.permissionsError,
    error: mocks.permissionsError ? new Error("Permission lookup failed") : null,
  }),
}));
vi.mock("react-toastify", () => ({ toast: { success: mocks.notify, error: mocks.notify } }));
vi.mock("./ExtensionFormFields", () => ({
  ExtensionFormFields: ({ draft, onChange }: { draft: ExtensionFormDraft; onChange: (draft: ExtensionFormDraft) => void }) => (
    <input aria-label="Extension name" value={draft.name} onChange={(event) => onChange({ ...draft, name: event.target.value })} />
  ),
}));

const extension = { schema_version: 1, name: "test-extension", description: "", upstreams: {}, routes: [], enabled: false };
const response = (data: unknown, status = 200) => new Response(status === 204 ? null : JSON.stringify(data), {
  status, headers: { "content-type": "application/json" },
});
const wrapper = (children: React.ReactNode, location = "/") => (
  <QueryClientProvider client={queryClient}><MemoryRouter initialEntries={[location]}>{children}</MemoryRouter></QueryClientProvider>
);
const devicePage = () => wrapper(
  <Routes>
    <Route element={<ExtensionAccess />}>
      <Route path="/" element={<DeviceKeysCard name="test-extension" />} />
    </Route>
  </Routes>,
);

describe("minimal extension credentials UI", () => {
  beforeEach(() => {
    queryClient.clear();
    mocks.user = "user-a"; mocks.loading = false; mocks.permissionsError = false; mocks.denied = false;
    mocks.grants = new Set(["extension.read", "extension.register", "extension.deregister"]);
    mocks.keys = []; mocks.requests = [];
    mocks.notify.mockReset();
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: vi.fn().mockResolvedValue(undefined) } });
    mocks.fetch.mockReset().mockImplementation(async (request: Request) => {
      const path = new URL(request.url).pathname;
      const text = request.method === "POST" ? await request.text() : "";
      const body: unknown = text ? JSON.parse(text) : null;
      mocks.requests.push({ method: request.method, path, body });
      if (mocks.denied) return response({ message: "Denied" }, 403);
      if (path.endsWith("/internal-key/rotate")) return response({ internal_key: "rotated-test-key" });
      if (path.endsWith("/device-keys") && request.method === "POST") {
        mocks.keys = [{ device_id: "device-a", module_id: "$edgeAgent" }];
        return response({ device_id: "device-a", device_key: "issued-test-key" }, 201);
      }
      if (request.method === "DELETE") { mocks.keys = []; return response(null, 204); }
      if (path.endsWith("/device-keys")) return response(mocks.keys);
      if (path.endsWith("/extensions") && request.method === "POST") return response({ ...extension, internal_key: "registration-test-key" }, 201);
      return response(extension);
    });
  });
  afterEach(() => { queryClient.clear(); });

  it("does not mount restricted routes or fetch extension data while read access is unresolved or missing", async () => {
    mocks.loading = true;
    const { rerender } = render(devicePage());
    expect(screen.getByText("Checking extension permissions...")).toBeInTheDocument();
    expect(mocks.fetch).not.toHaveBeenCalled();
    mocks.loading = false; mocks.grants.clear();
    rerender(devicePage());
    expect(screen.getByText("Not permitted")).toBeInTheDocument();
    expect(mocks.fetch).not.toHaveBeenCalled();
    mocks.permissionsError = true;
    rerender(devicePage());
    expect(screen.getByText("Could not check extension permissions")).toBeInTheDocument();
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("guards direct registration/edit routes separately from read access", () => {
    mocks.grants = new Set(["extension.read"]);
    render(wrapper(<Routes>
      <Route element={<ExtensionAccess />}>
        <Route element={<ExtensionAccess permissionKey="extension.register" />}>
          <Route path="new" element={<div>Registration form</div>} />
        </Route>
      </Route>
    </Routes>, "/new"));
    expect(screen.getByText("Requires extension.register.")).toBeInTheDocument();
    expect(screen.queryByText("Registration form")).not.toBeInTheDocument();
  });

  it("adds the navigation link only for extension readers", () => {
    mocks.grants.clear();
    const tree = () => wrapper(<Routes><Route path="/" element={<SettingsLayout />} /></Routes>);
    const { rerender } = render(tree());
    expect(screen.queryByRole("link", { name: "Extensions" })).not.toBeInTheDocument();
    mocks.grants.add("extension.read");
    rerender(tree());
    expect(screen.getByRole("link", { name: "Extensions" })).toHaveAttribute("href", "/extensions");
  });

  it("lists metadata without credential controls for read-only users", async () => {
    mocks.grants = new Set(["extension.read"]);
    mocks.keys = [{ device_id: "device-a", module_id: "$edgeAgent" }];
    render(devicePage());
    expect(await screen.findByText("device-a")).toBeInTheDocument();
    expect(screen.getByText("$edgeAgent")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Issue key" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Revoke" })).not.toBeInTheDocument();
  });

  it("issues, displays once, copies and revokes a device key with confirmation", async () => {
    render(devicePage());
    await screen.findByText("No device keys issued.");
    fireEvent.change(screen.getByLabelText("Device ID"), { target: { value: " device-a " } });
    fireEvent.change(screen.getByLabelText("Module ID (optional)"), { target: { value: "$edgeAgent" } });
    fireEvent.click(screen.getByRole("button", { name: "Issue key" }));
    expect(await screen.findByText("issued-test-key")).toBeInTheDocument();
    expect(mocks.requests).toContainEqual({ method: "POST", path: "/extensions/test-extension/device-keys", body: { device_id: "device-a", module_id: "$edgeAgent" } });
    expect(JSON.stringify(queryClient.getQueryCache().getAll().map((query) => query.state.data))).not.toContain("issued-test-key");
    await waitFor(() => expect(queryClient.getMutationCache().getAll()).toHaveLength(0));
    fireEvent.click(screen.getByRole("button", { name: "Copy key" }));
    await screen.findByRole("button", { name: "Copied" });
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("issued-test-key");
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    await waitFor(() => expect(screen.queryByText("issued-test-key")).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Revoke" }));
    expect(mocks.requests.filter((request) => request.method === "DELETE")).toHaveLength(0);
    fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Revoke key" }));
    await screen.findByText("No device keys issued.");
    expect(mocks.requests).toContainEqual({ method: "DELETE", path: "/extensions/test-extension/device-keys/device-a", body: null });
  });

  it("reports clipboard failures without losing the one-time key", async () => {
    vi.mocked(navigator.clipboard.writeText).mockRejectedValue(new Error("Clipboard unavailable"));
    render(devicePage());
    fireEvent.change(screen.getByLabelText("Device ID"), { target: { value: "device-a" } });
    fireEvent.click(screen.getByRole("button", { name: "Issue key" }));
    await screen.findByText("issued-test-key");
    fireEvent.click(screen.getByRole("button", { name: "Copy key" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Select and copy it manually");
    expect(screen.getByText("issued-test-key")).toBeInTheDocument();
  });

  it("suppresses stale metadata on a later 403 and stops focus/reconnect refetches", async () => {
    mocks.keys = [{ device_id: "device-a" }];
    render(devicePage());
    await screen.findByText("device-a");
    mocks.denied = true;
    await act(async () => { await queryClient.invalidateQueries(); });
    await screen.findByText("Not permitted");
    expect(screen.queryByRole("cell", { name: "device-a" })).not.toBeInTheDocument();
    const calls = mocks.fetch.mock.calls.length;
    await act(async () => {
      focusManager.setFocused(false); focusManager.setFocused(true);
      onlineManager.setOnline(false); onlineManager.setOnline(true);
      await queryClient.invalidateQueries();
    });
    expect(mocks.fetch).toHaveBeenCalledTimes(calls);
  });

  it("clears credentials when the account or read permission changes", async () => {
    const { rerender } = render(devicePage());
    fireEvent.change(screen.getByLabelText("Device ID"), { target: { value: "device-a" } });
    fireEvent.click(screen.getByRole("button", { name: "Issue key" }));
    await screen.findByText("issued-test-key");
    mocks.user = "user-b";
    rerender(devicePage());
    await waitFor(() => expect(screen.queryByText("issued-test-key")).not.toBeInTheDocument());
    mocks.grants.clear();
    rerender(devicePage());
    expect(screen.getByText("Not permitted")).toBeInTheDocument();
  });

  it("does not redisplay an issued key after write access is lost and regained", async () => {
    const { rerender } = render(devicePage());
    fireEvent.change(screen.getByLabelText("Device ID"), { target: { value: "device-a" } });
    fireEvent.click(screen.getByRole("button", { name: "Issue key" }));
    await screen.findByText("issued-test-key");
    mocks.grants.delete("extension.register");
    rerender(devicePage());
    await waitFor(() => expect(screen.queryByText("issued-test-key")).not.toBeInTheDocument());
    mocks.grants.add("extension.register");
    rerender(devicePage());
    expect(screen.queryByText("issued-test-key")).not.toBeInTheDocument();
  });

  it("reports an issuance denial without showing a credential", async () => {
    render(devicePage());
    await screen.findByText("No device keys issued.");
    mocks.denied = true;
    fireEvent.change(screen.getByLabelText("Device ID"), { target: { value: "device-a" } });
    fireEvent.click(screen.getByRole("button", { name: "Issue key" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Not permitted");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(mocks.requests.filter((request) => request.method === "POST")).toHaveLength(1);
  });

  it("shows registration's internal key before navigation and clears the mutation result", async () => {
    render(wrapper(<Routes><Route path="extensions" element={<Outlet />}>
      <Route index element={<div>Extension list</div>} />
      <Route path="new" element={<RegisterExtensionPage />} />
    </Route></Routes>, "/extensions/new"));
    fireEvent.click(screen.getByRole("button", { name: "Skip, start blank" }));
    fireEvent.change(screen.getByLabelText("Extension name"), { target: { value: "test-extension" } });
    fireEvent.click(screen.getByRole("button", { name: "Register" }));
    expect(await screen.findByText("registration-test-key")).toBeInTheDocument();
    expect(screen.queryByText("Extension list")).not.toBeInTheDocument();
    await waitFor(() => expect(queryClient.getMutationCache().getAll()).toHaveLength(0));
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    await screen.findByText("Extension list");
    expect(screen.queryByText("registration-test-key")).not.toBeInTheDocument();
  });

  it("confirms internal-key rotation, resets its mutation cache and clears the key on close", async () => {
    render(wrapper(<Routes><Route path="extensions/:name" element={<ExtensionDetail />} /></Routes>, "/extensions/test-extension"));
    await screen.findByRole("heading", { name: "test-extension" });
    fireEvent.click(screen.getByRole("button", { name: "Rotate key" }));
    expect(mocks.requests.filter((request) => request.path.endsWith("/internal-key/rotate"))).toHaveLength(0);
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Rotate key" }));
    await screen.findByText("rotated-test-key");
    await waitFor(() => expect(queryClient.getMutationCache().getAll()).toHaveLength(0));
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    await waitFor(() => expect(screen.queryByText("rotated-test-key")).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Rotate key" }));
    expect(screen.queryByText("rotated-test-key")).not.toBeInTheDocument();
    expect(within(screen.getByRole("dialog")).getByRole("button", { name: "Rotate key" })).toBeInTheDocument();
  });
});
