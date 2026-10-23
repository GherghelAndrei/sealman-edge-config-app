import { useState } from "react"
import { Link, useParams } from "react-router-dom"
import { Eraser, FileJson, Hand, RotateCcw, Undo2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { ExecutionBadge, JsonDialog, MockPage, Section, SourceBadge, SyncBadge, TypeBadge } from "./components"
import { buildManifest, deviceStatus, fmt, useMockStore } from "./mockData"

const cities = ["Berlin", "Munich", "Kempten"]

export default function MockDeviceDeployment() {
  const { deviceId = "" } = useParams()
  const store = useMockStore()
  const [assignOpen, setAssignOpen] = useState(false)
  const [assignDep, setAssignDep] = useState("")
  const [assignVersion, setAssignVersion] = useState("")
  const [showSent, setShowSent] = useState(false)

  const device = store.devices.find((d) => d.device_id === deviceId)
  if (!device) return <MockPage title="Not found">Unknown device.</MockPage>

  const dd = store.deviceDeployments.find((d) => d.device_id === deviceId)
  const deployment = dd && store.deployments.find((d) => d.id === dd.deployment_id)
  const version = deployment?.versions.find((v) => v.version === dd?.version)
  const status = deployment?.type === "COMPOSE" ? null : deviceStatus(store, deviceId)
  const modules = store.moduleStates[deviceId] ?? []
  const history = store.executions.filter((e) => e.device_id === deviceId)
  const pickedDep = store.deployments.find((d) => d.id === assignDep)

  const assign = () => {
    store.assignManual(deviceId, assignDep, Number(assignVersion), "RUNNING")
    setAssignOpen(false)
  }

  return (
    <MockPage
      title={`Device ${deviceId}`}
      subtitle={`line ${device.meta.line} · endpoints: ${device.endpoints.map((e) => `${e.type} (${e.vendor})`).join(", ") || "none"}`}
      crumbs={[{ label: "Devices", to: "/mockups/devices" }]}
      actions={
        <>
          <Button size="sm" variant="secondary" onClick={() => setAssignOpen(true)}>
            <Hand className="h-4 w-4 mr-1" />
            Assign manually
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={!dd || dd.desired_state === "ABSENT"}
            onClick={() => dd && store.assignManual(deviceId, dd.deployment_id, dd.version, "ABSENT")}
          >
            <Eraser className="h-4 w-4 mr-1" />
            Clear
          </Button>
        </>
      }
    >
      <Section title="Metadata (demo trigger)" description="Changing a device's metadata re-evaluates all target rules for it. Try moving it to another city.">
        <div className="flex items-center gap-3">
          <Label>city</Label>
          <Select value={device.meta.city} onValueChange={(v) => store.setDeviceMeta(deviceId, "city", v)}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {cities.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Section>

      <Section
        title="Deployment on this device"
        description="One deployment per device. A rule assigns it (RULE), or a user does (MANUAL, rules leave it alone)."
        actions={
          <>
            {dd?.source === "MANUAL" && (
              <Button size="sm" variant="outline" onClick={() => store.releaseToRules(deviceId)}>
                <Undo2 className="h-4 w-4 mr-1" />
                Hand back to rules
              </Button>
            )}
            {deployment?.type === "IOTEDGE" && (
              <Button size="sm" variant="outline" onClick={() => store.redeliver([deviceId])}>
                <RotateCcw className="h-4 w-4 mr-1" />
                Redeliver
              </Button>
            )}
          </>
        }
      >
        {dd && deployment ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">Deployment</div>
              <Link className="font-medium text-vibrant-blue hover:underline" to={`/mockups/deployments/${deployment.id}`}>
                {deployment.name}
              </Link>{" "}
              v{dd.version} <TypeBadge type={deployment.type} />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Desired</div>
              {dd.desired_state}
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Source</div>
              <SourceBadge source={dd.source} ruleId={dd.rule_id} />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Status</div>
              {status ? <SyncBadge status={status} /> : <span className="text-xs text-muted-foreground">Compose: delivery later</span>}
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Generation</div>
              {dd.generation}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No deployment. No rule matches this device and nobody assigned one.</p>
        )}
        {version?.definition && (
          <Button size="sm" variant="outline" className="mt-3" onClick={() => setShowSent(true)}>
            <FileJson className="h-4 w-4 mr-1" />
            Last sent manifest
          </Button>
        )}
      </Section>

      <Section title="Modules reported by the device" description="From the $edgeAgent reported properties, polled by Sealman.">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Module</TableHead>
              <TableHead>Image</TableHead>
              <TableHead>State</TableHead>
              <TableHead>Exit code</TableHead>
              <TableHead>Restarts</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {modules.map((m) => (
              <TableRow key={m.module_name} className={cn(m.runtime_status !== "running" && "bg-red-50")}>
                <TableCell className="font-medium">{m.module_name}</TableCell>
                <TableCell className="text-xs">{m.image}</TableCell>
                <TableCell className={cn(m.runtime_status !== "running" && "font-semibold text-red-700")}>{m.runtime_status}</TableCell>
                <TableCell>{m.exit_code ?? "–"}</TableCell>
                <TableCell>{m.restart_count}</TableCell>
              </TableRow>
            ))}
            {modules.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground">
                  Nothing reported yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Section>

      <Section title="History" description="Every apply to this device (deployment_executions). Updates live.">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>What</TableHead>
              <TableHead>Triggered by</TableHead>
              <TableHead>State</TableHead>
              <TableHead>Error</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {history.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="text-xs">{fmt(e.created_at)}</TableCell>
                <TableCell className="text-xs">
                  {e.action === "CLEAR" ? "Clear" : `${store.deployments.find((d) => d.id === e.deployment_id)?.name} v${e.version}`}
                </TableCell>
                <TableCell className="text-xs">{e.trigger}</TableCell>
                <TableCell>
                  <ExecutionBadge state={e.state} />
                </TableCell>
                <TableCell className="text-xs text-red-700">{e.error}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Section>

      {version?.definition && (
        <JsonDialog
          open={showSent}
          onOpenChange={setShowSent}
          title={`Last manifest sent to ${deviceId}`}
          description="sent_manifest of the last execution (password masked)."
          value={buildManifest(version.definition, dd?.desired_state === "ABSENT")}
        />
      )}

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign manually</DialogTitle>
            <DialogDescription>
              Pins this device to a deployment and version. Target rules will no longer change it until you hand it back to rules.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <Select
              value={assignDep}
              onValueChange={(v) => {
                setAssignDep(v)
                setAssignVersion(String(store.deployments.find((d) => d.id === v)?.versions[0]?.version ?? ""))
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Deployment" />
              </SelectTrigger>
              <SelectContent>
                {store.deployments
                  .filter((d) => d.versions.length)
                  .map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {pickedDep && (
              <Select value={assignVersion} onValueChange={setAssignVersion}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {pickedDep.versions.map((v) => (
                    <SelectItem key={v.version} value={String(v.version)}>
                      v{v.version} – {v.change_note}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>
              Cancel
            </Button>
            <Button disabled={!assignDep || !assignVersion} onClick={assign}>
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MockPage>
  )
}
