import { BrowserRouter, Routes, Route, Outlet, Navigate } from "react-router-dom";
import DeviceList from "./features/Devices/DeviceList";
import MainLayout from "./layouts/MainLayout";
import { ToastContainer } from "react-toastify";
import { queryClient } from "./config/queryConfig";
import Dashboard from "./pages/Dashboard";

import SidebarLayout from "./layouts/SidebarLayout";
import DeviceDetail from "./features/Devices/DeviceDetail";
import Deployments from "./features/deployments/Deployments";
import ErrorFallback from "./pages/ErrorFallback";
import PageNotFound from "./pages/PageNotFound";
import Version from "./pages/Version";
import { QueryClientProvider } from "@tanstack/react-query";
// import { SmartEmsSettings } from "@/features/Devices/Network/smart_ems/pages/settings.tsx";
import SettingsLayout from "./pages/settings/SettingsLayout";
import PlatformTypesSettings from "./pages/settings/PlatformTypesSettings";
import TemplatesSettings from "./pages/settings/TemplatesSettings";
import ExtensionsSettings from "./features/Extensions/ExtensionsSettings";
import ExtensionDetail from "./features/Extensions/ExtensionDetail";
import RegisterExtensionPage from "./features/Extensions/RegisterExtensionPage";
import EditExtensionPage from "./features/Extensions/EditExtensionPage";
import { useAuth } from "./auth";
import { useEffect } from "react";
import { NewUserCheck } from "./components/NewUserCheck";
import DeploymentDetails from "./features/deployments/DeploymentDetails";
import ServiceDetails from "./features/deployments/ServiceDetails";
import Authorization from "./features/authorization/Authorization";
import Teams from "./features/authorization/Teams";
import Roles from "./features/authorization/Roles";
import Scopes from "./features/authorization/Scopes";
import Users from "./features/authorization/Users";
import UserProfile from "./pages/UserProfile";

export default function App() {
  const auth = useAuth();

  // Auto sign-in for Keycloak (similar to useAutoSignin)
  useEffect(() => {
    if (!auth.isAuthenticated && !auth.isLoading) {
      auth.signIn();
    }
  }, [auth, auth.isAuthenticated, auth.isLoading]);

  // Do not mount routes (or their react-query hooks) until OIDC has a user.
  // Otherwise axios/openapi middleware call getAccessToken() while sessionStorage
  // is still empty, throw "User is not authenticated", and the UI treats the
  // backend as unauthenticated even after login completes.
  if (auth.isLoading || !auth.isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-gray-500">
        {auth.isLoading ? "Loading..." : "Redirecting to sign in..."}
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Dashboard />} errorElement={<ErrorFallback />} />
            <Route path="devices" element={<Outlet />}>
              <Route
                index
                element={
                  <div className="h-full overflow-y-auto">
                    <DeviceList />
                  </div>
                }
              />
              <Route path=":deviceId/*" element={<SidebarLayout sidebar={<DeviceList />} />}>
                <Route path="*" element={<DeviceDetail />} />
              </Route>
            </Route>

            <Route path="deployments" element={<Outlet />}>
              <Route index element={<Deployments />} />
              <Route path=":deploymentId" element={<Outlet />}>
                <Route index element={<DeploymentDetails />} />
                <Route path="services/:serviceId" element={<ServiceDetails />} />
              </Route>
            </Route>

            <Route path="authorization" element={<Authorization />}>
              <Route index element={<Navigate to="teams" replace />} />
              <Route path="teams" element={<Teams />} />
              <Route path="roles" element={<Roles />} />
              <Route path="scopes" element={<Scopes />} />
              <Route path="users" element={<Users />} />
            </Route>

            <Route path="settings" element={<SettingsLayout />}>
              <Route path="platform-types" element={<PlatformTypesSettings />} />
              <Route path="templates" element={<TemplatesSettings />} />
              <Route path="extensions" element={<Outlet />}>
                <Route index element={<ExtensionsSettings />} />
                <Route path="new" element={<RegisterExtensionPage />} />
                <Route path=":name" element={<Outlet />}>
                  <Route index element={<ExtensionDetail />} />
                  <Route path="edit" element={<EditExtensionPage />} />
                </Route>
              </Route>
              {/* <Route path="smartems" element={<SmartEmsSettings />} /> */}
            </Route>
            <Route path="user/profile" element={<UserProfile />} />
            <Route path="version" element={<Version />} />
            <Route path="*" element={<PageNotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <NewUserCheck />
      <ToastContainer position="bottom-right" />
    </QueryClientProvider>
  );
}
