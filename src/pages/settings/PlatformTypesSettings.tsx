import { useMemo } from "react";
import TypesManager from "@/features/PlatformTypes/TypesManager";
import DeviceTableColumnsCard from "@/features/PlatformTypes/DeviceTableColumnsCard";
import DefaultScanPortsCard from "@/features/PlatformTypes/DefaultScanPortsCard";
import useGetDeviceTypes from "@/generated/edge-administration/hooks/device_types/useGetDeviceTypes";
import { usePostDeviceType } from "@/generated/edge-administration/hooks/device_types/usePostDeviceType";
import { useUpdateDeviceType } from "@/generated/edge-administration/hooks/device_types/useUpdateDeviceType";
import { useDeleteDeviceType } from "@/generated/edge-administration/hooks/device_types/useDeleteDeviceType";
import useGetEndpointTypes from "@/generated/edge-administration/hooks/endpoint_types/useGetEndpointTypes";
import { usePostEndpointType } from "@/generated/edge-administration/hooks/endpoint_types/usePostEndpointType";
import { useUpdateEndpointType } from "@/generated/edge-administration/hooks/endpoint_types/useUpdateEndpointType";
import { useDeleteEndpointType } from "@/generated/edge-administration/hooks/endpoint_types/useDeleteEndpointType";
import useGetServiceTypes from "@/generated/edge-administration/hooks/service_types/useGetServiceTypes";
import { usePostServiceType } from "@/generated/edge-administration/hooks/service_types/usePostServiceType";
import { useUpdateServiceType } from "@/generated/edge-administration/hooks/service_types/useUpdateServiceType";
import { useDeleteServiceType } from "@/generated/edge-administration/hooks/service_types/useDeleteServiceType";
import { listRegisteredBrowsers } from "@/lib/browserRegistry";
import {
  ENDPOINT_ROLE_OPTIONS,
  ENDPOINT_TYPE_DEFAULT_FIELDS,
  ENDPOINT_TYPE_DEFAULT_MAPPING,
  SERVICE_ROLE_OPTIONS,
  SERVICE_TYPE_DEFAULT_FIELDS,
  SERVICE_TYPE_DEFAULT_MAPPING,
} from "@/features/PlatformTypes/typeRoles";

export default function PlatformTypesSettings() {
  const deviceTypesQuery = useGetDeviceTypes();
  const { postDeviceType } = usePostDeviceType();
  const { updateDeviceType } = useUpdateDeviceType();
  const { deleteDeviceType } = useDeleteDeviceType();

  // The default type's fields always apply to every device type (see
  // db/sqlalchemy/device_type.py:_serialize_with_mirroring), so a brand-new device type should
  // start with them pre-filled rather than a blank fields editor.
  const defaultDeviceTypeFields = useMemo(
    () => deviceTypesQuery.data?.find((t) => t.type_id === "default")?.fields ?? {},
    [deviceTypesQuery.data],
  );

  const endpointTypesQuery = useGetEndpointTypes();
  const { postEndpointType } = usePostEndpointType();
  const { updateEndpointType } = useUpdateEndpointType();
  const { deleteEndpointType } = useDeleteEndpointType();

  const serviceTypesQuery = useGetServiceTypes();
  const { postServiceType } = usePostServiceType();
  const { updateServiceType } = useUpdateServiceType();
  const { deleteServiceType } = useDeleteServiceType();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Platform Types</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Define the device, endpoint and service types available on the platform, and the fields captured for
          each.
        </p>
      </div>

      <div className="flex flex-col gap-6">
        <TypesManager
          title="Device Types"
          singularLabel="Device Type"
          description="Types available when creating devices."
          types={deviceTypesQuery.data ?? []}
          isLoading={deviceTypesQuery.isLoading}
          defaultFields={defaultDeviceTypeFields}
          protectedTypeId="default"
          onCreate={async (body) => {
            await postDeviceType(body);
            await deviceTypesQuery.refetch();
          }}
          onUpdate={async (typeId, body) => {
            await updateDeviceType({ typeId, body });
            await deviceTypesQuery.refetch();
          }}
          onDelete={async (typeId) => {
            await deleteDeviceType(typeId);
            await deviceTypesQuery.refetch();
          }}
        />

        <DeviceTableColumnsCard />

        <TypesManager
          title="Endpoint Types"
          singularLabel="Endpoint Type"
          description="Types available when creating endpoints on a device."
          types={endpointTypesQuery.data ?? []}
          isLoading={endpointTypesQuery.isLoading}
          defaultFields={ENDPOINT_TYPE_DEFAULT_FIELDS}
          defaultMapping={ENDPOINT_TYPE_DEFAULT_MAPPING}
          roleOptions={ENDPOINT_ROLE_OPTIONS}
          supportsListVisibility
          cascadeDelete={{ instancesLabel: "endpoint" }}
          onCreate={async (body) => {
            await postEndpointType({ ...body, mapping: body.mapping ?? {}, extension_fields: {} });
            await endpointTypesQuery.refetch();
          }}
          onUpdate={async (typeId, body) => {
            await updateEndpointType({ typeId, body });
            await endpointTypesQuery.refetch();
          }}
          onDelete={async (typeId) => {
            await deleteEndpointType(typeId, true);
            await endpointTypesQuery.refetch();
          }}
        />

        <TypesManager
          title="Service Types"
          singularLabel="Service Type"
          description="Types available when creating services on an endpoint."
          types={serviceTypesQuery.data ?? []}
          isLoading={serviceTypesQuery.isLoading}
          browserKindOptions={listRegisteredBrowsers()}
          defaultFields={SERVICE_TYPE_DEFAULT_FIELDS}
          defaultMapping={SERVICE_TYPE_DEFAULT_MAPPING}
          roleOptions={SERVICE_ROLE_OPTIONS}
          cascadeDelete={{ instancesLabel: "service" }}
          onCreate={async (body) => {
            await postServiceType({ ...body, mapping: body.mapping ?? {} });
            await serviceTypesQuery.refetch();
          }}
          onUpdate={async (typeId, body) => {
            await updateServiceType({ typeId, body });
            await serviceTypesQuery.refetch();
          }}
          onDelete={async (typeId) => {
            await deleteServiceType(typeId, true);
            await serviceTypesQuery.refetch();
          }}
        />

        <DefaultScanPortsCard />
      </div>
    </div>
  );
}
