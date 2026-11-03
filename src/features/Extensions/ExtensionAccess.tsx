import { Outlet, useParams } from "react-router-dom";
import { useAuth } from "@/auth";
import { ErrorState, LoadingState } from "@/components/ui/page-state";
import { PERMISSION_KEYS, type PermissionKey } from "@/features/authorization/permissions/permission-keys";
import { usePermissions } from "@/features/authorization/permissions/use-permissions";
import { getErrorMessage, isForbidden } from "@/lib/errors";

export default function ExtensionAccess({ permissionKey = PERMISSION_KEYS.EXTENSION_READ }: { permissionKey?: PermissionKey }) {
  const auth = useAuth();
  const { name } = useParams();
  const { hasPermission, isLoading, isError, error } = usePermissions({ permissionKey });

  if (!auth.isAuthenticated || isLoading) return <LoadingState label="Checking extension permissions..." />;
  if (isError && !isForbidden(error)) {
    return <ErrorState title="Could not check extension permissions" message={getErrorMessage(error)} />;
  }
  if (!hasPermission) return <ErrorState title="Not permitted" message={`Requires ${permissionKey}.`} />;
  return <Outlet key={JSON.stringify([auth.user?.iss, auth.user?.sub, name])} />;
}
