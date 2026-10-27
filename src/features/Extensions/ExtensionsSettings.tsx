import { useNavigate } from "react-router-dom";
import { Plus, AlertCircle, PlugZap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { withPermissionRequiredTooltip } from "@/features/authorization/permissions/withPermissionRequiredTooltip";
import { PERMISSION_KEYS } from "@/features/authorization/permissions/permission-keys";
import { useListExtensions } from "@/generated/edge-administration/hooks/useExtensions";
import { ExtensionEnabledBadge } from "./ExtensionEnabledBadge";
import { HealthDot } from "./HealthDot";
import { useExtensionHealth } from "./useExtensionHealth";
import { isExtensionsDisabledError } from "./extensionErrors";

const GuardedButton = withPermissionRequiredTooltip(Button);

function ExtensionRow({ name, enabled, description, upstreamCount, routeCount, persistedUpstreams, onOpen }: {
  name: string;
  enabled: boolean;
  description: string;
  upstreamCount: number;
  routeCount: number;
  persistedUpstreams?: Record<string, { last_status: "unknown" | "healthy" | "unhealthy"; last_detail?: string | null; last_checked_at?: string | null }>;
  onOpen: () => void;
}) {
  const health = useExtensionHealth(name, enabled, persistedUpstreams);

  return (
    <TableRow className="cursor-pointer" onClick={onOpen}>
      <TableCell className="font-medium">
        <div className="flex items-center gap-2">
          <HealthDot status={health.rollup} lastCheckedAt={health.lastCheckedAt} disabled={!enabled} checkStartedAt={health.checkStartedAt} error={health.error} />
          {name}
        </div>
      </TableCell>
      <TableCell>
        <ExtensionEnabledBadge enabled={enabled} />
      </TableCell>
      <TableCell className="text-muted-foreground">{description || <span className="italic text-muted-foreground/60">-</span>}</TableCell>
      <TableCell className="text-muted-foreground text-sm">{upstreamCount}</TableCell>
      <TableCell className="text-muted-foreground text-sm">{routeCount}</TableCell>
    </TableRow>
  );
}

export default function ExtensionsSettings() {
  const navigate = useNavigate();
  const { data: extensions, isLoading, isError, error } = useListExtensions();
  const extensionsDisabled = isError && isExtensionsDisabledError(error);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Extensions</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Extensions register their own routes, actions, and upstream services onto this platform.
          </p>
        </div>
        {!extensionsDisabled && (
          <GuardedButton permissionKey={PERMISSION_KEYS.EXTENSION_REGISTER} onClick={() => navigate("new")}>
            <Plus className="h-4 w-4 mr-1" />
            Register extension
          </GuardedButton>
        )}
      </div>

      <div className="border rounded-lg overflow-hidden bg-card">
        {isError ? (
          <div className="flex items-center justify-center h-32 gap-2 text-muted-foreground">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <span className="text-sm">
              {extensionsDisabled ? "The extension subsystem is disabled." : "Failed to load extensions."}
            </span>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Upstreams</TableHead>
                <TableHead>Routes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                  </TableRow>
                ))
              ) : extensions?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                    <div className="flex flex-col items-center gap-2">
                      <PlugZap className="h-8 w-8 opacity-30" />
                      No extensions registered yet.
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                extensions?.map((ext) => (
                  <ExtensionRow
                    key={ext.name}
                    name={ext.name}
                    enabled={ext.enabled}
                    description={ext.description}
                    upstreamCount={Object.keys(ext.upstreams ?? {}).length}
                    routeCount={ext.routes?.length ?? 0}
                    persistedUpstreams={ext.upstreams}
                    onOpen={() => navigate(ext.name)}
                  />
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
