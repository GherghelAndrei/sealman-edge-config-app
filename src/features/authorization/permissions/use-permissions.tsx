import { edgeConfigApi } from "@/api/edgeConfig/edgeConfigApi";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/auth";
import { noPermissionForActionMessage } from "./no-permission-tooltip-utils";
import { PERMISSION_KEYS, type PermissionKey } from "./permission-keys";

interface PermissionsResponse {
  permissions: string[];
}

export interface UsePermissionsOutput {
  hasPermission: boolean;
  noPermissionsMessage?: string;
  isLoading?: boolean;
  isError?: boolean;
  error?: Error | null;
}

export interface UsePermissionsOptions {
  deviceId?: string;
  permissionKey: PermissionKey;
}

let mockPermissions = false;
export function setMockPermission(){
  mockPermissions = true;
}

export function usePermissions({
  deviceId,
  permissionKey
}: UsePermissionsOptions): UsePermissionsOutput {
  const auth = useAuth();
  const { data, isLoading, isError, error } = useQuery<PermissionsResponse>({
    queryKey: ["permissions", deviceId ?? "platform", auth.user?.iss, auth.user?.sub],
    queryFn: async ({ signal }) => mockPermissions ? authPermissionsResponseBody : edgeConfigApi.getPermissions(deviceId, signal),
    enabled: mockPermissions || auth.isAuthenticated,
    gcTime: 0,
  });

  const hasPermission = !isError && (data?.permissions?.includes(permissionKey) ?? false);
  const noPermissionsMessage = !hasPermission ? noPermissionForActionMessage({permissionKey, deviceId: deviceId!}) : undefined;
  return { hasPermission, noPermissionsMessage, isLoading, isError, error };
}

const authPermissionsResponseBody = {
    "permissions": Object.values(PERMISSION_KEYS)
};
