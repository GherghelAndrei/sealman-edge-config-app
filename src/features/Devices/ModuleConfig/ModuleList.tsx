import { useState } from "react";
import { useParams } from "react-router-dom";
import Badge, { BadgeColor } from "../../../components/Typography/Badge";
import { ChevronRightIcon, CubeIcon, LinkIcon } from "@heroicons/react/24/outline";
import { Heading } from "../../../components/Typography/Heading";
import { ErrorState, LoadingState } from "@/components/ui/page-state";
import { getErrorMessage, isForbidden, isTerminalConfigStatusError } from "@/lib/errors";
import { useAuth } from "@/auth";
import Modal, { ModalState } from "../../../components/Modal/Modal";
import { Tab } from "@headlessui/react";
import ModuleLogs from "./ModuleLogs";
import ModuleConfig from "./ModuleConfig";
import DirectMethods from "./DirectMethods";
import { edgeConfigApi } from "../../../api/edgeConfig/edgeConfigApi";
import { useQuery } from "@tanstack/react-query";
import type { ModuleData } from "../../../api/edgeConfig/edgeConfigApiHooks";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";


export default function ModuleList() {
  const { deviceId } = useParams();
  const auth = useAuth();
  const identity = JSON.stringify([auth.user?.iss, auth.user?.sub]);
  if (!auth.isAuthenticated) return null;
  return <ModuleListContent key={`${identity}:${deviceId}`} deviceId={deviceId} identity={identity} />;
}

function ModuleListContent({ deviceId, identity }: { deviceId?: string; identity: string }) {
  const [modalState, setModalState] = useState<ModalState>({
    isOpen: false,
    children: <></>
  });
  const { data: modules, error: modulesError, refetch: refetchModules } = useQuery<ModuleData[]>({
    queryKey: ["getModules", deviceId, identity],
    queryFn: ({ signal }) => edgeConfigApi.getModules(deviceId, signal),
    enabled: (query) => Boolean(deviceId) && !isForbidden(query.state.error),
    refetchInterval: (query) => isForbidden(query.state.error) ? false : 8000,
    gcTime: 0,
  });
  const moduleNames = modules?.map((module) => module.moduleId);

  const { isPending, isError, data: moduleData, error: statusError, refetch } = useQuery({
    queryKey: ['getConfigStatus', deviceId, identity, moduleNames],
    queryFn: async ({ signal }) => {
      const configStatus = await edgeConfigApi.getConfigStatus(deviceId, { modules: moduleNames }, signal);
      return (modules ?? []).map((module) => {
        return {
          ...module,
          appMessage: configStatus[module.moduleId]?.appMessage || undefined,
          appStatus: configStatus[module.moduleId]?.appStatus || undefined,
          confStatus: configStatus[module.moduleId]?.confStatus || undefined,
          desiredConfId: configStatus[module.moduleId]?.desiredConfId || undefined,
          reportedConfId: configStatus[module.moduleId]?.reportedConfId || undefined
        }
      });
    },
    enabled: (query) => Boolean(deviceId && modules) && !modulesError && !isTerminalConfigStatusError(query.state.error),
    refetchInterval: (query) => isTerminalConfigStatusError(query.state.error) ? false : 5000,
    gcTime: 0,
  });

  if (modulesError) return <ErrorState title={isForbidden(modulesError) ? "Not permitted" : "Could not load the modules"} message={getErrorMessage(modulesError)} onRetry={() => { void refetchModules(); }} />;
  if (isPending) return <LoadingState label="Loading modules..." />
  if (isError) return <ErrorState title={isForbidden(statusError) ? "Not permitted" : "Could not load the modules"} message={getErrorMessage(statusError)} onRetry={() => { void refetch(); }} />

  const moduleRows = moduleData.map((module, index) => (
    <TableRow className="cursor-pointer" onClick={() => setModalState({
      children: <ModuleModal module={module} />,
      title: <div className="flex items-center">{deviceId}<ChevronRightIcon className="w-4 h-4" /> {module.moduleName}</div>,
      isOpen: true
    })} key={index}>
      <TableCell>
        <Badge color={module.connectionState === "Connected" ? BadgeColor.Green : BadgeColor.Red}>
          {module.connectionState === "Connected" ? <LinkIcon className="w-3 h-3" /> : ""}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge color={
          (module.moduleName === "$edgeAgent" && module.status === "runtime_online") ? BadgeColor.Green :
          (module.moduleName === "$edgeAgent" && module.status === "runtime_offline") ? BadgeColor.Yellow :
          (module.moduleName === "$edgeAgent" && module.status === null) ? BadgeColor.Green :
          (module.moduleName === "$edgeHub" && module.status === "runtime_online") ? BadgeColor.Green :
          (module.moduleName === "$edgeHub" && module.status === "runtime_offline") ? BadgeColor.Yellow :
          (module.moduleName === "$edgeHub" && module.status === null) ? BadgeColor.Green :
          (module.status === "running") ? BadgeColor.Green :
          (module.status === "backoff") ? BadgeColor.Red :
          (module.status === "failed") ? BadgeColor.Red :
          (module.status === "unhealthy") ? BadgeColor.Red :
          (module.status === "stopped") ? BadgeColor.Red :
          (module.status === "deploy_scheduled") ? BadgeColor.Purple :
          (module.status === "delete_scheduled") ? BadgeColor.Yellow :
          (module.status === "unknown") ? BadgeColor.Gray :
          (module.status === "running:grey" || module.status === "backoff:grey"  || module.status === "failed:grey" || module.status === "unhealthy:grey" || module.status === "stopped:grey") ? BadgeColor.Gray : BadgeColor.Gray
        }>
          {module.status === "running" && "RUNNING"}
          {module.status === "backoff" && "BACKOFF"}
          {module.status === "failed" && "FAILED"}
          {module.status === "unhealthy" && "UNHEALTHY"}
          {module.status === "stopped" && "STOPPED"}
          {module.status === "unknown" && "UNKNOWN"}
          {module.status === "failed:grey" && "FAILED"}
          {module.status === "running:grey" && "RUNNING"}
          {module.status === "backoff:grey" && "BACKOFF"}
          {module.status === "unhealthy:grey" && "UNHEALTHY"}
          {module.status === "stopped:grey" && "STOPPED"}
          {module.status === "runtime_online" && "RUNTIME ONLINE"}
          {module.status === "runtime_offline" && "RUNTIME OFFLINE"}
          {module.status === null && "UNKNOWN"}
        </Badge>
      </TableCell>
      <TableCell>
        {(() => {
          switch (module.confStatus) {
            case 'NO_CONFIG':
              return <Badge color={BadgeColor.Gray}>NTS</Badge>;
            case 'OK':
              return <Badge color={BadgeColor.Green}>SYNC</Badge>;
            case 'PENDING':
              return <Badge color={BadgeColor.Yellow}>PENDING</Badge>;
            case 'INITIAL_PENDING':
              return <Badge color={BadgeColor.Purple}>INITIAL_PENDING</Badge>;
            default:
              return <Badge color={BadgeColor.Purple}>{module.confStatus}</Badge>;
          }
        })()}
      </TableCell>
      <TableCell>
        {(() => {
          switch (module.appStatus) {
            case 'OK':
              return <Badge color={BadgeColor.Green}>CONFIG OK</Badge>;
            case 'ERROR':
              return <Badge color={BadgeColor.Red}>CONFIG ERROR</Badge>;
            case 'NO_STATUS':
              return <Badge color={BadgeColor.Gray}>NO CONFIG</Badge>;
            default:
              return <Badge color={BadgeColor.Purple}>{module.appStatus}</Badge>;
          }
        })()}
      </TableCell>
      <TableCell className="font-medium">
        {module.moduleName}
      </TableCell>
      <TableCell>
      {(() => {
          switch (module.deploymentType) {
            case 'base':
              return <Badge color={BadgeColor.Indigo}>base</Badge>;
            case 'sems':
              return <Badge color={BadgeColor.Yellow}>sems</Badge>;
            default:
              return <Badge color={BadgeColor.Indigo}>base</Badge>;
          }
        })()}
      </TableCell>
      <TableCell>
      {(() => {
          switch (module.moduleType) {
            case 'iotedge':
              return <Badge color={BadgeColor.Indigo}>iotedge</Badge>;
            case 'api':
              return <Badge color={BadgeColor.Purple}>api</Badge>;
            case 'compose':
              return <Badge color={BadgeColor.Yellow}>compose</Badge>;
            default:
              return <Badge color={BadgeColor.Indigo}>iotedge</Badge>;
          }
        })()}
      </TableCell>
      <TableCell>{module.version}</TableCell>
    </TableRow>
  ));

  return (
    <>
      <div className="space-y-2">
        <Heading>
          <CubeIcon />
          Modules
        </Heading>
        <div className="overflow-hidden rounded-lg border bg-background">
          <Table>
        <TableHeader className="bg-slate-50">
          <TableRow className="hover:bg-transparent">
            <TableHead className="h-10 text-xs font-semibold uppercase tracking-wider text-muted-foreground">API</TableHead>
            <TableHead className="h-10 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Module Status</TableHead>
            <TableHead className="h-10 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Config Sync</TableHead>
            <TableHead className="h-10 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Config Status</TableHead>
            <TableHead className="h-10 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Module Name</TableHead>
            <TableHead className="h-10 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Stack</TableHead>
            <TableHead className="h-10 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Type</TableHead>
            <TableHead className="h-10 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Version</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>{moduleRows}</TableBody>
          </Table>
        </div>
      </div>
      <Modal modalState={modalState} setModalState={setModalState}></Modal>
    </>
  );
}

function ModuleModal({ module }: { module: ModuleData }) {
  return (
    <Tab.Group className="h-full">
      <div className="h-full">
        <Tab.List>
          <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1 text-sm font-medium text-muted-foreground">
            {["Module Configuration", "Methods", "Logs"].map((label) => (
              <Tab
                key={label}
                className={({ selected }) =>
                  `rounded-md px-3 py-1.5 transition-colors focus:outline-hidden ${selected ? "bg-background text-foreground shadow-sm" : "hover:text-foreground"}`
                }
              >
                {label}
              </Tab>
            ))}
          </div>
        </Tab.List>
        <Tab.Panels as="div" className="mt-4 h-full overflow-y-auto">
          <Tab.Panel className="h-full ">
            <ModuleConfig moduleName={module.moduleId} appMessage={module.appMessage} moduleStatus={module.status} />
          </Tab.Panel>
          <Tab.Panel className="h-full ">
            <DirectMethods moduleName={module.moduleId} />
          </Tab.Panel>
          <Tab.Panel className="h-full ">
            <ModuleLogs moduleName={module.moduleId} />
          </Tab.Panel>
        </Tab.Panels>
      </div>
    </Tab.Group>
  );
}
