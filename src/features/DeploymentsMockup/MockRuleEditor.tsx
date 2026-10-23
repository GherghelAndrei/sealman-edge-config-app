import { useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { Plus, Save, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DeviceLink, ExpressionChips, MockPage, PlanLabel, Section } from "./components"
import { matches, plan, useMockStore, type Expression } from "./mockData"

const keys = ["device.city", "device.line", "endpoint.type", "endpoint.vendor", "service.type"]

interface Row {
  key: string
  values: string[]
}

const toRows = (e: Expression): Row[] => Object.entries(e).map(([key, values]) => ({ key, values }))
const toExpression = (rows: Row[]): Expression => Object.fromEntries(rows.filter((r) => r.values.length).map((r) => [r.key, r.values]))

export default function MockRuleEditor() {
  const { deploymentId, ruleId } = useParams()
  const navigate = useNavigate()
  const store = useMockStore()
  const deployment = store.deployments.find((d) => d.id === deploymentId)
  const existing = store.rules.find((r) => r.id === ruleId)

  const [version, setVersion] = useState(String(existing?.version ?? deployment?.versions[0]?.version ?? ""))
  const [enabled, setEnabled] = useState(existing?.enabled ?? true)
  const [rows, setRows] = useState<Row[]>(existing ? toRows(existing.expression) : [{ key: "device.city", values: ["Berlin"] }])
  const expression = useMemo(() => toExpression(rows), [rows])

  // Preview = what reconciliation would do if this rule were saved now (POST /target-rules/preview).
  const preview = useMemo(() => {
    if (!deployment) return []
    const draft = { id: existing?.id ?? "this-rule", deployment_id: deployment.id, version: Number(version), expression, enabled, updated_at: new Date().toISOString() }
    const rules = [...store.rules.filter((r) => r.id !== draft.id), draft]
    const matching = new Set(store.devices.filter((d) => matches(d, expression)).map((d) => d.device_id))
    return plan({ devices: store.devices, rules, deviceDeployments: store.deviceDeployments }).filter(
      (p) => matching.has(p.device_id) || p.before?.rule_id === draft.id,
    )
  }, [deployment, existing, version, expression, enabled, store.rules, store.devices, store.deviceDeployments])

  if (!deployment) return <MockPage title="Not found">Unknown deployment.</MockPage>

  const nameOf = (id: string) => store.deployments.find((d) => d.id === id)?.name ?? id
  const changing = preview.filter((p) => !["UNCHANGED", "SKIPPED_MANUAL"].includes(p.kind)).length

  const save = () => {
    store.saveRule({ id: existing?.id, deployment_id: deployment.id, version: Number(version), expression, enabled })
    navigate(`/mockups/deployments/${deployment.id}`)
  }

  const setRow = (i: number, patch: Partial<Row>) => setRows(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)))

  return (
    <MockPage
      title={existing ? `Edit ${existing.id}` : "New target rule"}
      subtitle={`${deployment.name}: which devices should run which version. Saving applies it right away; it stays live afterwards.`}
      crumbs={[
        { label: "Deployments", to: "/mockups/deployments" },
        { label: deployment.name, to: `/mockups/deployments/${deployment.id}` },
      ]}
      actions={
        <Button size="sm" variant="secondary" disabled={!version} onClick={save}>
          <Save className="h-4 w-4 mr-1" />
          Save rule{changing ? ` (changes ${changing} device${changing === 1 ? "" : "s"})` : ""}
        </Button>
      }
    >
      <Section title="Version" description="Rolling back = pointing the rule at an older version.">
        <div className="flex items-center gap-6">
          <Select value={version} onValueChange={setVersion}>
            <SelectTrigger className="max-w-md">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {deployment.versions.map((v) => (
                <SelectItem key={v.version} value={String(v.version)}>
                  v{v.version} – {v.change_note}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Label className="flex items-center gap-2">
            <Switch checked={enabled} onCheckedChange={setEnabled} />
            Enabled
          </Label>
        </div>
      </Section>

      <Section
        title="Devices where"
        description="AND across conditions, OR within a condition (comma-separated). Endpoint/service conditions: the device has an endpoint/service that matches."
        actions={
          <Button size="sm" variant="outline" onClick={() => setRows([...rows, { key: "device.line", values: [] }])}>
            <Plus className="h-4 w-4 mr-1" />
            Add condition
          </Button>
        }
      >
        <div className="space-y-2">
          {rows.map((r, i) => (
            <div key={i} className="flex items-center gap-2">
              {i > 0 && <span className="w-10 text-xs text-muted-foreground">AND</span>}
              {i === 0 && <span className="w-10" />}
              <Select value={r.key} onValueChange={(key) => setRow(i, { key })}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {keys.map((k) => (
                    <SelectItem key={k} value={k}>
                      {k}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">is one of</span>
              <Input
                className="max-w-xs"
                defaultValue={r.values.join(", ")}
                placeholder="Berlin, Munich"
                onChange={(e) =>
                  setRow(i, {
                    values: e.target.value
                      .split(",")
                      .map((v) => v.trim())
                      .filter(Boolean),
                  })
                }
              />
              <Button size="sm" variant="ghost" onClick={() => setRows(rows.filter((_, j) => j !== i))}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <div className="pt-2 text-xs text-muted-foreground">
            Stored as <ExpressionChips expression={expression} />
          </div>
        </div>
      </Section>

      <Section title="Preview" description="What happens to each device if you save now. Updates as you type.">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Device</TableHead>
              <TableHead>Runs now</TableHead>
              <TableHead>After saving</TableHead>
              <TableHead>Effect</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {preview.map((p) => (
              <TableRow key={p.device_id}>
                <TableCell>
                  <DeviceLink id={p.device_id} />
                </TableCell>
                <TableCell className="text-xs">
                  {p.before ? `${nameOf(p.before.deployment_id)} v${p.before.version} (${p.before.source}${p.before.desired_state === "ABSENT" ? ", ABSENT" : ""})` : "nothing"}
                </TableCell>
                <TableCell className="text-xs">
                  {p.kind === "SKIPPED_MANUAL"
                    ? "unchanged"
                    : p.after?.desired_state === "ABSENT"
                      ? "modules removed"
                      : p.after && `${nameOf(p.after.deployment_id)} v${p.after.version}`}
                </TableCell>
                <TableCell>
                  <PlanLabel kind={p.kind} />
                </TableCell>
              </TableRow>
            ))}
            {preview.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground">
                  No device matches.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Section>
    </MockPage>
  )
}
