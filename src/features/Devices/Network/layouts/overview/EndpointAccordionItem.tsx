import { useState } from "react";
import { HelpCircle, Server } from "lucide-react";
import { AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EndpointStatus, Port, LastStatusChange } from "@/features/Devices/Network/components";
import { MappedEndpoint, MappedPort } from "@/generated/edge-administration/hooks/network/usePostNetworkOverview";
import { formatMetadataValue } from "@/features/PlatformTypes/FieldValueInput";
import AssignEndpointDialog from "./AssignEndpointDialog";
import AssignServiceDialog from "./AssignServiceDialog";
import BrowseDialog from "./BrowseDialog";
import { endpointListKey, portListKey } from "./overviewMerge";
import { withPermissionRequiredTooltip } from "@/features/authorization/permissions/withPermissionRequiredTooltip";
import { PERMISSION_KEYS } from "@/features/authorization/permissions/permission-keys";

const GuardedButton = withPermissionRequiredTooltip(Button);

const ALWAYS_SHOWN_ENDPOINT_FIELD_KEYS = new Set(["ip", "name"]);

interface props {
  endpoint: MappedEndpoint;
  deviceId: string;
  onCreated: () => void;
  onOpenDetails: (endpointId: string) => void;
  onOpenServiceDetails: (serviceId: string) => void;
}

export default function EndpointAccordionItem({ endpoint, deviceId, onCreated, onOpenDetails, onOpenServiceDetails }: props) {
  const isUnidentified = endpoint.source === "unidentified";
  const isConfigured = endpoint.source === "configured";
  // Matches a configured endpoint type's default IP, but hasn't actually been assigned yet - it's
  // otherwise easy to mistake for a real, already-assigned endpoint (same icon/row styling), so
  // this needs its own visual highlight to make "still needs to be assigned" obvious at a glance.
  const needsAssignment = endpoint.source === "default";
  // "name" is a regular resolved field (like "ip"), not a top-level property - only present once
  // there's a real instance ("configured" source).
  const name = endpoint.endpoint_data?.name?.value as string | undefined;

  // Extra endpoint type fields to show next to the IP address - each field's own "Show in
  // endpoints list" toggle (set on the endpoint type's field definition, see FieldsEditor.tsx)
  // decides this, not a separate settings page.
  const extraEndpointInfo = Object.entries(endpoint.endpoint_data ?? {})
    .filter(([key]) => !ALWAYS_SHOWN_ENDPOINT_FIELD_KEYS.has(key))
    .filter(([, resolved]) => resolved.field?.show_in_list)
    .map(([, resolved]) => (resolved.field ? formatMetadataValue(resolved.value, resolved.field) : null))
    .filter((value): value is string => Boolean(value));

  const [assignEndpointOpen, setAssignEndpointOpen] = useState(false);
  const [assignPort, setAssignPort] = useState<MappedPort | null>(null);
  const [browsingPort, setBrowsingPort] = useState<MappedPort | null>(null);

  return (
    <AccordionItem value={endpointListKey(endpoint)} className="last:border-b-0">
      <div className={`flex items-center pr-4 ${needsAssignment ? "bg-amber-50" : ""}`}>
        <div className="flex-1">
          <AccordionTrigger className="px-4 hover:no-underline hover:bg-muted/40">
            <div className="flex items-center justify-between w-full gap-4">
              <div className="flex items-center gap-3">
                {isUnidentified ? (
                  <HelpCircle className="w-5 h-5 text-orange-500 shrink-0" />
                ) : (
                  <Server className={`w-5 h-5 shrink-0 ${needsAssignment ? "text-amber-600" : "text-muted-foreground"}`} />
                )}
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <p className={isUnidentified ? "font-medium text-orange-600" : needsAssignment ? "font-medium text-amber-700" : "font-medium"}>
                      {name ?? endpoint.type_label ?? "Unidentified"}
                    </p>
                    {needsAssignment && (
                      <Badge variant="outline" className="text-amber-700 border-amber-400 bg-amber-100">
                        Not assigned
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {endpoint.type_label && name ? `${endpoint.type_label} · ` : ""}
                    {endpoint.ip}
                    {extraEndpointInfo.length > 0 ? ` · ${extraEndpointInfo.join(" · ")}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <EndpointStatus value={endpoint.status} type="icon" />
              </div>
            </div>
          </AccordionTrigger>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          {isConfigured ? (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onOpenDetails(endpoint.endpoint_id as string);
              }}
            >
              Details
            </Button>
          ) : (
            <GuardedButton
              deviceId={deviceId}
              permissionKey={PERMISSION_KEYS.DEVICE_ENDPOINT_WRITE}
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setAssignEndpointOpen(true);
              }}
            >
              Assign
            </GuardedButton>
          )}
        </div>
      </div>
      <AccordionContent className="px-4">
        {endpoint.ports.length === 0 ? (
          <p className="text-xs text-muted-foreground">No services detected on this endpoint.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Status</TableHead>
                <TableHead className="w-[100px]">Port</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Last status change</TableHead>
                <TableHead className="text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {endpoint.ports.map((port) => {
                // "unidentified" (no service type matched at all) and "default" (matched a
                // service type's default port, but not yet a real assigned service instance)
                // both still need someone to assign them - highlight both the same way so they
                // don't blend in with already-assigned ("configured") services.
                const portNeedsAssignment = port.source === "unidentified" || port.source === "default";
                // Only an already-assigned service has a detail page to jump to - clicking an
                // unassigned/unidentified port's row wouldn't have anywhere to go.
                const serviceId = port.service_id;
                return (
                <TableRow
                  key={portListKey(port)}
                  className={[portNeedsAssignment ? "bg-amber-50" : "", serviceId ? "cursor-pointer hover:bg-muted/40" : ""].join(" ")}
                  onClick={serviceId ? () => onOpenServiceDetails(serviceId) : undefined}
                >
                  <TableCell>
                    <EndpointStatus value={port.status} type="text" />
                  </TableCell>
                  <TableCell>
                    <Port value={port.port != null ? port.port.toString() : "-"} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className={portNeedsAssignment ? "text-amber-700 font-medium" : ""}>
                        {port.type_label ?? "Unidentified"}
                      </span>
                      {portNeedsAssignment && (
                        <Badge variant="outline" className="text-amber-700 border-amber-400 bg-amber-100">
                          Not assigned
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <LastStatusChange date={port.lastStatusChange ?? undefined} variant="outline" />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {port.source !== "configured" && isConfigured && (
                        <GuardedButton
                          deviceId={deviceId}
                          permissionKey={PERMISSION_KEYS.DEVICE_ENDPOINT_WRITE}
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setAssignPort(port);
                          }}
                        >
                          Assign
                        </GuardedButton>
                      )}
                      {port.browser_kind && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={port.status !== "online"}
                          title={port.status !== "online" ? "Only available while the service is online" : undefined}
                          onClick={(e) => {
                            e.stopPropagation();
                            setBrowsingPort(port);
                          }}
                        >
                          Browse
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </AccordionContent>

      <AssignEndpointDialog
        open={assignEndpointOpen}
        onOpenChange={setAssignEndpointOpen}
        deviceId={deviceId}
        ip={endpoint.ip ?? undefined}
        defaultTypeId={endpoint.source === "default" ? endpoint.type_id : null}
        onCreated={onCreated}
      />

      {endpoint.endpoint_id && assignPort && (
        <AssignServiceDialog
          open={assignPort !== null}
          onOpenChange={(open) => !open && setAssignPort(null)}
          endpointId={endpoint.endpoint_id}
          port={assignPort.port ?? undefined}
          defaultTypeId={assignPort.source === "default" ? assignPort.type_id : null}
          onCreated={onCreated}
        />
      )}

      {endpoint.ip && (
        <BrowseDialog
          open={browsingPort !== null}
          onOpenChange={(open) => !open && setBrowsingPort(null)}
          kind={browsingPort?.browser_kind ?? null}
          ip={endpoint.ip}
          port={browsingPort?.port ?? 0}
        />
      )}
    </AccordionItem>
  );
}
