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
  const { data, isLoading } = useQuery<PermissionsResponse>({
    queryKey: ["permissions", deviceId ?? "platform"],
    queryFn: async () => mockPermissions ? authPermissionsResponseBody : edgeConfigApi.getPermissions(deviceId),
    enabled: mockPermissions || auth.isAuthenticated,
  });

  const hasPermission = data?.permissions?.includes(permissionKey) ?? false;
  const noPermissionsMessage = !hasPermission ? noPermissionForActionMessage({permissionKey, deviceId: deviceId!}) : undefined;
  return { hasPermission: hasPermission, noPermissionsMessage, isLoading: isLoading };
}

const authPermissionsResponseBody = {
    "permissions": Object.values(PERMISSION_KEYS)
};
