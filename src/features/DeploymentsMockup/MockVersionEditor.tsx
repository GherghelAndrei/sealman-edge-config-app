import { useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { toast } from "react-toastify"
import { AlertCircle, ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MockPage, Section } from "./components"
import { buildManifest, emptyRuntime, useMockStore, type MockDefinition, type MockModule } from "./mockData"

const emptyDefinition: MockDefinition = { runtime: { ...emptyRuntime, routes: {} }, modules: [] }

const composeTemplate = `services:
  web:
    image: nginx:1.27
    ports:
      - "8080:80"
    restart: always
`

const newModule = (): MockModule => ({
  name: "",
  image: "",
  env: {},
  create_options: {},
  desired_properties: {},
  restart_policy: "always",
  status: "running",
  image_pull_policy: "on-create",
  startup_order: null,
})

function KeyValueText({ value, onChange, placeholder }: { value: Record<string, string>; onChange: (v: Record<string, string>) => void; placeholder: string }) {
  const [text, setText] = useState(Object.entries(value).map(([k, v]) => `${k}=${v}`).join("\n"))
  return (
    <Textarea
      rows={2}
      className="font-mono text-xs"
      placeholder={placeholder}
      value={text}
      onChange={(e) => {
        setText(e.target.value)
        const entries = e.target.value
          .split("\n")
          .map((l) => l.split("="))
          .filter(([k]) => k?.trim())
          .map(([k, ...v]) => [k.trim(), v.join("=")])
        onChange(Object.fromEntries(entries))
      }}
    />
  )
}

function JsonText({ value, onChange }: { value: Record<string, unknown>; onChange: (v: Record<string, unknown>) => void }) {
  const [text, setText] = useState(JSON.stringify(value, null, 2))
  const [error, setError] = useState(false)
  return (
    <Textarea
      rows={3}
      className={`font-mono text-xs ${error ? "border-red-500" : ""}`}
      value={text}
      onChange={(e) => {
        setText(e.target.value)
        try {
          onChange(JSON.parse(e.target.value || "{}"))
          setError(false)
        } catch {
          setError(true)
        }
      }}
    />
  )
}

function ModuleCard({ module, onChange, onRemove }: { module: MockModule; onChange: (m: MockModule) => void; onRemove: () => void }) {
  const [open, setOpen] = useState(!module.name)
  const set = <K extends keyof MockModule>(k: K, v: MockModule[K]) => onChange({ ...module, [k]: v })
  return (
    <div className="rounded border">
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-50">
        <button className="flex items-center gap-1 text-sm font-medium" onClick={() => setOpen(!open)}>
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          {module.name || <span className="text-muted-foreground">new module</span>}
        </button>
        <span className="text-xs text-muted-foreground truncate">{module.image}</span>
        <Button size="sm" variant="ghost" className="ml-auto" onClick={onRemove}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      {open && (
        <div className="grid grid-cols-2 gap-3 p-3">
          <div className="grid gap-1">
            <Label className="text-xs">Name</Label>
            <Input value={module.name} onChange={(e) => set("name", e.target.value)} placeholder="telegraf" />
          </div>
          <div className="grid gap-1">
            <Label className="text-xs">Image</Label>
            <Input value={module.image} onChange={(e) => set("image", e.target.value)} placeholder="registry.example.com/telegraf:1.3.0" />
          </div>
          <div className="grid gap-1">
            <Label className="text-xs">Restart policy</Label>
            <Select value={module.restart_policy} onValueChange={(v) => set("restart_policy", v as MockModule["restart_policy"])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["always", "on-failure", "on-unhealthy", "never"].map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="grid gap-1">
              <Label className="text-xs">Status</Label>
              <Select value={module.status} onValueChange={(v) => set("status", v as MockModule["status"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="running">running</SelectItem>
                  <SelectItem value="stopped">stopped</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1">
              <Label className="text-xs">Pull</Label>
              <Select value={module.image_pull_policy} onValueChange={(v) => set("image_pull_policy", v as MockModule["image_pull_policy"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="on-create">on-create</SelectItem>
                  <SelectItem value="never">never</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1">
              <Label className="text-xs">Startup order</Label>
              <Input
                type="number"
                value={module.startup_order ?? ""}
                onChange={(e) => set("startup_order", e.target.value === "" ? null : Number(e.target.value))}
              />
            </div>
          </div>
          <div className="grid gap-1">
            <Label className="text-xs">Environment (KEY=value per line)</Label>
            <KeyValueText value={module.env} onChange={(v) => set("env", v)} placeholder="SITE=Berlin" />
          </div>
          <div className="grid gap-1">
            <Label className="text-xs">Create options (Docker, JSON)</Label>
            <JsonText value={module.create_options} onChange={(v) => set("create_options", v)} />
          </div>
          <div className="grid gap-1 col-span-2">
            <Label className="text-xs">Desired properties (module twin, JSON)</Label>
            <JsonText value={module.desired_properties} onChange={(v) => set("desired_properties", v)} />
          </div>
        </div>
      )}
    </div>
  )
}

export default function MockVersionEditor() {
  const { deploymentId } = useParams()
  const navigate = useNavigate()
  const deployment = useMockStore((s) => s.deployments.find((d) => d.id === deploymentId))
  const addVersion = useMockStore((s) => s.addVersion)
  const base = deployment?.versions[0]
  const [def, setDef] = useState<MockDefinition>(() => structuredClone(base?.definition ?? emptyDefinition))
  const [yaml, setYaml] = useState(base?.compose_yaml ?? composeTemplate)
  const [note, setNote] = useState("")
  const [routesText, setRoutesText] = useState(Object.entries(def.runtime.routes).map(([k, v]) => `${k}=${v}`).join("\n"))

  const manifest = useMemo(() => buildManifest(def), [def])

  if (!deployment) return <MockPage title="Not found">Unknown deployment.</MockPage>

  const isEdge = deployment.type === "IOTEDGE"
  const unchanged = base && (isEdge ? JSON.stringify(base.definition) === JSON.stringify(def) : base.compose_yaml === yaml)
  const nextVersion = (base?.version ?? 0) + 1
  const crumbs = [
    { label: "Deployments", to: "/mockups/deployments" },
    { label: deployment.name, to: `/mockups/deployments/${deployment.id}` },
  ]

  const setRuntime = (patch: Partial<MockDefinition["runtime"]>) => setDef({ ...def, runtime: { ...def.runtime, ...patch } })

  const save = () => {
    if (unchanged) {
      toast.error(`409 DUPLICATE_CONTENT: same content as v${base!.version}`)
      return
    }
    addVersion(deployment.id, isEdge ? { change_note: note, definition: def } : { change_note: note, compose_yaml: yaml })
    toast.success(`Saved ${deployment.name} v${nextVersion}. Point a target rule at it to roll it out.`)
    navigate(`/mockups/deployments/${deployment.id}`)
  }

  const saveSection = (
    <Section title="Save">
      <div className="grid gap-2">
        <Label htmlFor="note">What did you change? (required)</Label>
        <Input id="note" placeholder="telegraf 1.3.0 → 1.4.0" value={note} onChange={(e) => setNote(e.target.value)} />
        {unchanged && (
          <p className="flex items-center gap-1 text-xs text-amber-700">
            <AlertCircle className="h-3.5 w-3.5" />
            Nothing changed yet: saving now would be rejected as a duplicate of v{base!.version}.
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => navigate(`/mockups/deployments/${deployment.id}`)}>
            Cancel
          </Button>
          <Button disabled={!note.trim()} onClick={save}>
            Save as v{nextVersion}
          </Button>
        </div>
      </div>
    </Section>
  )

  const subtitle = base ? `Starts as a copy of v${base.version}. v${base.version} itself never changes.` : "First version."

  if (!isEdge) {
    return (
      <MockPage title={`${deployment.name}: new version (v${nextVersion})`} subtitle={subtitle} crumbs={crumbs}>
        <Section title="docker-compose.yaml" description="Pasted as-is and stored on the version.">
          <Textarea rows={16} className="font-mono text-xs" value={yaml} onChange={(e) => setYaml(e.target.value)} />
        </Section>
        {saveSection}
      </MockPage>
    )
  }

  return (
    <MockPage title={`${deployment.name}: new version (v${nextVersion})`} subtitle={subtitle} crumbs={crumbs}>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="space-y-4">
          <Section title="Runtime (system modules)" description="Part of each version, so a runtime upgrade is a new version.">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1">
                <Label className="text-xs">edgeAgent image</Label>
                <Input
                  value={def.runtime.edge_agent.image}
                  onChange={(e) => setRuntime({ edge_agent: { ...def.runtime.edge_agent, image: e.target.value } })}
                />
              </div>
              <div className="grid gap-1">
                <Label className="text-xs">edgeHub image</Label>
                <Input
                  value={def.runtime.edge_hub.image}
                  onChange={(e) => setRuntime({ edge_hub: { ...def.runtime.edge_hub, image: e.target.value } })}
                />
              </div>
              <div className="grid gap-1">
                <Label className="text-xs">Store and forward TTL (seconds)</Label>
                <Input
                  type="number"
                  value={def.runtime.edge_hub.store_and_forward_ttl_secs}
                  onChange={(e) =>
                    setRuntime({ edge_hub: { ...def.runtime.edge_hub, store_and_forward_ttl_secs: Number(e.target.value) } })
                  }
                />
              </div>
              <div className="grid gap-1 col-span-2">
                <Label className="text-xs">Routes (name=FROM … INTO … per line)</Label>
                <Textarea
                  rows={2}
                  className="font-mono text-xs"
                  value={routesText}
                  onChange={(e) => {
                    setRoutesText(e.target.value)
                    const routes = Object.fromEntries(
                      e.target.value
                        .split("\n")
                        .map((l) => l.split("="))
                        .filter(([k]) => k?.trim())
                        .map(([k, ...v]) => [k.trim(), v.join("=").trim()]),
                    )
                    setRuntime({ routes })
                  }}
                />
              </div>
            </div>
          </Section>

          <Section
            title={`Modules (${def.modules.length})`}
            actions={
              <Button size="sm" variant="outline" onClick={() => setDef({ ...def, modules: [...def.modules, newModule()] })}>
                <Plus className="h-4 w-4 mr-1" />
                Add module
              </Button>
            }
          >
            <div className="space-y-2">
              {def.modules.map((m, i) => (
                <ModuleCard
                  key={i}
                  module={m}
                  onChange={(nm) => setDef({ ...def, modules: def.modules.map((x, j) => (j === i ? nm : x)) })}
                  onRemove={() => setDef({ ...def, modules: def.modules.filter((_, j) => j !== i) })}
                />
              ))}
            </div>
          </Section>

          {saveSection}
        </div>

        <Section title="Manifest preview" description="What the manifest builder will send to each device (password masked). Updates live.">
          <pre className="max-h-[75vh] overflow-auto rounded bg-gray-950 p-3 text-xs text-green-200">
            {JSON.stringify(manifest, null, 2)}
          </pre>
        </Section>
      </div>
    </MockPage>
  )
}
