import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { ArrowLeft, ChevronRight, Loader2, Plus, Repeat, Server, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Centered } from "@/features/Devices/Network/components";
import { useNetworkPageStore } from "@/features/Devices/Network/stores";
import useGetEndpoint from "@/generated/edge-administration/hooks/endpoints/useGetEndpoint";
import { useUpdateEndpoint } from "@/generated/edge-administration/hooks/endpoints/useUpdateEndpoint";
import { useDeleteEndpoint } from "@/generated/edge-administration/hooks/endpoints/useDeleteEndpoint";
import useGetEndpointTypes from "@/generated/edge-administration/hooks/endpoint_types/useGetEndpointTypes";
import useGetServices from "@/generated/edge-administration/hooks/services/useGetServices";
import { validateFields } from "@/features/PlatformTypes/FieldValueInput";
import TypeFieldsForm from "./TypeFieldsForm";
import CustomFieldsEditor from "./CustomFieldsEditor";
import AssignServiceDialog from "./AssignServiceDialog";
import ConfirmDeleteDialog from "./ConfirmDeleteDialog";
import ReassignEndpointDialog from "./ReassignEndpointDialog";
import { withPermissionRequiredTooltip } from "@/features/authorization/permissions/withPermissionRequiredTooltip";
import { PERMISSION_KEYS } from "@/features/authorization/permissions/permission-keys";
import { endpointTitle, roleFieldKey } from "./endpointDisplay";

const GuardedButton = withPermissionRequiredTooltip(Button);

interface props {
  endpointId: string;
  onBack: () => void;
  onOpenServiceDetails: (serviceId: string) => void;
  onUpdated: () => void;
}

export default function EndpointDetailsPage({ endpointId, onBack, onOpenServiceDetails, onUpdated }: props) {
  const deviceId = useNetworkPageStore((s) => s.deviceId);
  const { data: endpoint, isLoading, isError, refetch } = useGetEndpoint(endpointId);
  const { data: endpointTypes } = useGetEndpointTypes();
  const { data: services, refetch: refetchServices } = useGetServices({ endpointId });
  const { updateEndpoint, isPending: isSaving } = useUpdateEndpoint();
  const { deleteEndpoint, isPending: isDeleting } = useDeleteEndpoint();

  const type = (endpointTypes ?? []).find((t) => t.type_id === endpoint?.type_id);
  const nameKey = roleFieldKey(type?.mapping, "name");
  const ipKey = roleFieldKey(type?.mapping, "ip");

  const [values, setValues] = useState<Record<string, unknown>>({});
  const [deletedKeys, setDeletedKeys] = useState<Set<string>>(new Set());
  const [isDirty, setIsDirty] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [addServiceOpen, setAddServiceOpen] = useState(false);
  const [reassignOpen, setReassignOpen] = useState(false);

  // Only reset the form when we actually switch to a *different* endpoint, or the same endpoint
  // gets reassigned to a different type - not on every background refetch of the same one/type,
  // which would otherwise wipe in-progress edits.
  const initializedForRef = useRef<string | null>(null);

  useEffect(() => {
    if (!endpoint) return;
    const initializationKey = `${endpoint.endpoint_id}:${endpoint.type_id}`;
    if (initializedForRef.current === initializationKey) return;
    initializedForRef.current = initializationKey;
    const initial: Record<string, unknown> = {};
    for (const [key, resolved] of Object.entries(endpoint.endpoint_data)) {
      initial[key] = resolved.value ?? null;
    }
    setValues(initial);
    setDeletedKeys(new Set());
    setIsDirty(false);
  }, [endpoint]);

  const schemaFields = type?.fields ?? {};
  const customValues = Object.fromEntries(Object.entries(values).filter(([key]) => !(key in schemaFields)));

  const setFieldValue = (key: string, value: unknown) => {
    setValues((v) => ({ ...v, [key]: value }));
    setDeletedKeys((d) => {
      if (!d.has(key)) return d;
      const next = new Set(d);
      next.delete(key);
      return next;
    });
    setIsDirty(true);
  };

  const deleteFieldValue = (key: string) => {
    setValues((v) => {
      const next = { ...v };
      delete next[key];
      return next;
    });
    setDeletedKeys((d) => new Set(d).add(key));
    setIsDirty(true);
  };

  const handleSave = async () => {
    // Only schema fields the user hasn't just deleted have anything to validate against -
    // custom fields are free-form, and a deleted field is about to be removed regardless.
    const fieldsToValidate = Object.fromEntries(
      Object.entries(schemaFields).filter(([key]) => !deletedKeys.has(key)),
    );
    const validationError = validateFields(values, fieldsToValidate);
    if (validationError) {
      toast.error(validationError);
      return;
    }
    try {
      const payload: Record<string, unknown> = { ...values };
      for (const key of deletedKeys) {
        payload[key] = null;
      }
      await updateEndpoint({ endpointId, body: { endpoint_data: payload } });
      toast.success("Endpoint updated");
      setDeletedKeys(new Set());
      setIsDirty(false);
      await refetch();
      onUpdated();
    } catch {
      toast.error("Failed to update endpoint");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteEndpoint(endpointId);
      toast.success("Endpoint removed");
      setDeleteOpen(false);
      onUpdated();
      onBack();
    } catch {
      toast.error("Failed to remove endpoint");
    }
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2">
        <ArrowLeft /> Back to Overview
      </Button>

      {isLoading && (
        <Centered>
          <p className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="animate-spin" /> Loading endpoint...
          </p>
        </Centered>
      )}

      {isError && (
        <Centered>
          <p className="text-sm text-destructive">Failed to load this endpoint.</p>
        </Centered>
      )}

      {endpoint && (
        <>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold leading-none tracking-tight">
                {endpointTitle({
                  typeLabel: endpoint.type_label,
                  name: nameKey ? values[nameKey] : undefined,
                  ip: ipKey ? values[ipKey] : undefined,
                })}
              </h2>
              <p className="text-sm text-muted-foreground mt-1.5">
                {endpoint.type_label}
                {endpoint.type_description ? ` · ${endpoint.type_description}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <GuardedButton
                deviceId={deviceId}
                permissionKey={PERMISSION_KEYS.DEVICE_ENDPOINT_WRITE}
                variant="outline"
                size="sm"
                onClick={() => setReassignOpen(true)}
              >
                <Repeat /> Reassign
              </GuardedButton>
              <GuardedButton
                deviceId={deviceId}
                permissionKey={PERMISSION_KEYS.DEVICE_ENDPOINT_WRITE}
                variant="destructive"
                size="sm"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 /> Remove Endpoint
              </GuardedButton>
            </div>
          </div>

          {type && (
            <div className="border rounded-lg bg-background">
              <div className="px-4 py-3 border-b">
                <h3 className="text-sm font-semibold">Endpoint Type Definition</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  The field schema defined on the "{type.label}" endpoint type.
                </p>
              </div>
              <div className="divide-y">
                {Object.entries(type.fields).map(([key, definition]) => (
                  <div key={key} className="flex items-center justify-between px-4 py-2 text-sm">
                    <span>
                      {definition.label} <span className="text-muted-foreground font-mono text-xs">({key})</span>
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {definition.type}
                      {definition.required ? " · required" : ""}
                      {definition.default !== null && definition.default !== undefined
                        ? ` · default: ${definition.default}`
                        : ""}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border rounded-lg bg-background">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">Instance Data</h3>
                <p className="text-xs text-muted-foreground mt-1">The actual field values for this endpoint.</p>
              </div>
              <GuardedButton
                deviceId={deviceId}
                permissionKey={PERMISSION_KEYS.DEVICE_ENDPOINT_WRITE}
                size="sm"
                onClick={handleSave}
                disabled={!isDirty || isSaving}
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </GuardedButton>
            </div>
            <div className="p-4 space-y-6">
              {type && (
                <TypeFieldsForm
                  fields={type.fields}
                  values={values}
                  onChange={setFieldValue}
                  onDelete={deleteFieldValue}
                />
              )}

              <div className="space-y-2 pt-2 border-t">
                <h4 className="text-xs font-semibold text-muted-foreground">Custom Fields</h4>
                <CustomFieldsEditor
                  customValues={customValues}
                  onChange={setFieldValue}
                  onDelete={deleteFieldValue}
                  onAdd={setFieldValue}
                />
              </div>
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden bg-background">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <h3 className="text-sm font-semibold">Services</h3>
              <GuardedButton
                deviceId={deviceId}
                permissionKey={PERMISSION_KEYS.DEVICE_ENDPOINT_WRITE}
                variant="outline"
                size="sm"
                onClick={() => setAddServiceOpen(true)}
              >
                <Plus /> Add Service
              </GuardedButton>
            </div>
            {(services ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground p-4">No services configured on this endpoint yet.</p>
            ) : (
              <div className="divide-y">
                {(services ?? []).map((service) => (
                  <button
                    key={service.service_id}
                    type="button"
                    onClick={() => onOpenServiceDetails(service.service_id)}
                    className="flex items-center justify-between w-full px-4 py-3 hover:bg-muted/40 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <Server className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="font-medium text-sm">{service.type_label}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Remove endpoint"
        description={`This removes "${endpoint?.type_label}" and all of its configured services. This cannot be undone.`}
        onConfirm={handleDelete}
        isPending={isDeleting}
      />

      <AssignServiceDialog
        open={addServiceOpen}
        onOpenChange={setAddServiceOpen}
        endpointId={endpointId}
        onCreated={() => {
          refetchServices();
          onUpdated();
        }}
      />

      {endpoint && (
        <ReassignEndpointDialog
          open={reassignOpen}
          onOpenChange={setReassignOpen}
          endpointId={endpointId}
          currentTypeId={endpoint.type_id}
          onReassigned={async () => {
            await refetch();
            onUpdated();
          }}
        />
      )}
    </div>
  );
}
