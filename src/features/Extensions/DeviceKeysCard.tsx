import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ErrorState, LoadingState } from "@/components/ui/page-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { PERMISSION_KEYS } from "@/features/authorization/permissions/permission-keys";
import { usePermissions } from "@/features/authorization/permissions/use-permissions";
import { useIssueExtensionDeviceKey, useListExtensionDeviceKeys, useRevokeExtensionDeviceKey } from "@/generated/edge-administration/hooks/useExtensions";
import { getErrorMessage, isForbidden } from "@/lib/errors";
import { OneTimeKeyDialog } from "./OneTimeKeyDialog";
import { extensionErrorMessages } from "./extensionErrors";

export default function DeviceKeysCard({ name }: { name: string }) {
  const { hasPermission: canRead } = usePermissions({ permissionKey: PERMISSION_KEYS.EXTENSION_READ });
  const { hasPermission: canManage } = usePermissions({ permissionKey: PERMISSION_KEYS.EXTENSION_REGISTER });
  if (!canRead) return <ErrorState title="Not permitted" />;
  return <DeviceKeysContent key={`${name}:${canManage}`} name={name} canManage={canManage} />;
}

function DeviceKeysContent({ name, canManage }: { name: string; canManage: boolean }) {
  const keys = useListExtensionDeviceKeys(name, true);
  const issue = useIssueExtensionDeviceKey();
  const revoke = useRevokeExtensionDeviceKey();
  const [deviceId, setDeviceId] = useState("");
  const [moduleId, setModuleId] = useState("");
  const [issuedKey, setIssuedKey] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const busy = issue.isPending || revoke.isPending;

  async function issueKey() {
    if (!canManage) { setError("Not permitted"); return; }
    if (!deviceId.trim()) { setError("Enter a device ID."); return; }
    setError(null);
    try {
      const result = await issue.mutateAsync({
        params: { path: { name } },
        body: { device_id: deviceId.trim(), module_id: moduleId.trim() || undefined },
      });
      setIssuedKey(result.device_key);
      setDeviceId("");
      setModuleId("");
    } catch (cause) {
      setError(extensionErrorMessages(cause, "Could not issue device key").join("; "));
    } finally {
      issue.reset();
    }
  }

  async function revokeKey() {
    if (!canManage) { setError("Not permitted"); return; }
    if (!revokeTarget) return;
    setError(null);
    try {
      await revoke.mutateAsync({ params: { path: { name, device_id: revokeTarget } } });
      setRevokeTarget(null);
    } catch (cause) {
      setError(extensionErrorMessages(cause, "Could not revoke device key").join("; "));
    }
  }

  return (
    <Card>
      <CardHeader><CardTitle>Device keys</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Device routes authenticate with <code>X-Device-Key</code> on the field-ingress API.
          Issuing another key for a device immediately replaces its previous key.
          Module ID is optional metadata, not an additional authentication restriction.
        </p>
        {canManage && (
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label htmlFor="extension-device-id">Device ID</Label>
              <Input id="extension-device-id" value={deviceId} maxLength={128} onChange={(event) => setDeviceId(event.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="extension-module-id">Module ID (optional)</Label>
              <Input id="extension-module-id" value={moduleId} maxLength={128} onChange={(event) => setModuleId(event.target.value)} />
            </div>
            <Button type="button" disabled={busy || !deviceId.trim()} onClick={() => { void issueKey(); }}>
              {issue.isPending ? "Issuing..." : "Issue key"}
            </Button>
          </div>
        )}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {keys.isError ? (
          <ErrorState title={isForbidden(keys.error) ? "Not permitted" : "Could not load device keys"} message={getErrorMessage(keys.error)} onRetry={() => { void keys.refetch(); }} />
        ) : keys.isPending ? <LoadingState label="Loading device keys..." /> : keys.data?.length ? (
          <Table>
            <TableHeader><TableRow><TableHead>Device</TableHead><TableHead>Module</TableHead><TableHead>Issued</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>
              {keys.data.map((key) => (
                <TableRow key={key.device_id}>
                  <TableCell>{key.device_id}</TableCell>
                  <TableCell>{key.module_id ?? "-"}</TableCell>
                  <TableCell>{key.created_at ? new Date(key.created_at).toLocaleString() : "-"}</TableCell>
                  <TableCell>{canManage && <Button type="button" variant="destructive" size="sm" disabled={busy} onClick={() => setRevokeTarget(key.device_id)}>Revoke</Button>}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : <p className="text-sm text-muted-foreground">No device keys issued.</p>}
      </CardContent>
      <OneTimeKeyDialog title="New device key" secret={canManage ? issuedKey : null} onClose={() => setIssuedKey(null)} />
      <AlertDialog open={canManage && revokeTarget !== null} onOpenChange={(open) => { if (!open) setRevokeTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke device key?</AlertDialogTitle>
            <AlertDialogDescription>Device {revokeTarget} will no longer be able to call this extension&apos;s device routes with its current key.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={busy} onClick={() => { void revokeKey(); }}>Revoke key</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
