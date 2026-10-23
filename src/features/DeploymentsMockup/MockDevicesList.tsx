import { useNavigate } from "react-router-dom"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { MockPage, SourceBadge, SyncBadge } from "./components"
import { deviceStatus, useMockStore } from "./mockData"

export default function MockDevicesList() {
  const navigate = useNavigate()
  const store = useMockStore()

  return (
    <MockPage title="Devices" subtitle="Metadata drives the target rules. Open a device to change its city and watch the rules react.">
      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Device</TableHead>
              <TableHead>City</TableHead>
              <TableHead>Line</TableHead>
              <TableHead>Endpoints</TableHead>
              <TableHead>Deployment</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {store.devices.map((d) => {
              const dd = store.deviceDeployments.find((x) => x.device_id === d.device_id)
              const dep = dd && store.deployments.find((x) => x.id === dd.deployment_id)
              return (
                <TableRow key={d.device_id} className="cursor-pointer" onClick={() => navigate(`/mockups/devices/${d.device_id}`)}>
                  <TableCell className="font-medium">{d.device_id}</TableCell>
                  <TableCell>{d.meta.city}</TableCell>
                  <TableCell>{d.meta.line}</TableCell>
                  <TableCell className="text-xs">{d.endpoints.map((e) => e.type).join(", ") || "–"}</TableCell>
                  <TableCell>{dd ? (dd.desired_state === "ABSENT" ? <span className="text-muted-foreground">cleared</span> : `${dep?.name} v${dd.version}`) : "–"}</TableCell>
                  <TableCell>{dd && <SourceBadge source={dd.source} ruleId={dd.rule_id} />}</TableCell>
                  <TableCell>
                    <SyncBadge status={dep?.type === "COMPOSE" ? null : deviceStatus(store, d.device_id)} />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </MockPage>
  )
}
