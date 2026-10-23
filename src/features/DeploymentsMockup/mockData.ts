// In-memory demo data for the deployments mockup (NEW flow: target rules). No API calls; resets on reload.
import { create } from "zustand"

export type DeploymentType = "IOTEDGE" | "COMPOSE"
export type DesiredState = "RUNNING" | "ABSENT"
export type Source = "RULE" | "MANUAL"
export type ExecutionState = "PENDING" | "APPLYING" | "APPLIED" | "SUCCESS" | "FAILED" | "SUPERSEDED"
export type Scope = "device" | "endpoint" | "service"
export type Expression = Record<string, string[]>

export interface MockModule {
  name: string
  image: string
  env: Record<string, string>
  create_options: Record<string, unknown>
  desired_properties: Record<string, unknown>
  restart_policy: "always" | "on-failure" | "on-unhealthy" | "never"
  status: "running" | "stopped"
  image_pull_policy: "on-create" | "never"
  startup_order: number | null
}

export interface MockDefinition {
  runtime: {
    edge_agent: { image: string; env: Record<string, string>; create_options: Record<string, unknown> }
    edge_hub: { image: string; env: Record<string, string>; create_options: Record<string, unknown>; store_and_forward_ttl_secs: number }
    routes: Record<string, string>
  }
  modules: MockModule[]
}

export interface MockVersion {
  version: number
  change_note: string
  content_hash: string
  created_by_name: string
  created_at: string
  definition?: MockDefinition // IOTEDGE
  compose_yaml?: string // COMPOSE
}

export interface MockDeployment {
  id: string
  name: string
  type: DeploymentType
  description: string
  created_at: string
  versions: MockVersion[] // newest first
}

export interface MockRule {
  id: string
  deployment_id: string
  version: number
  expression: Expression
  enabled: boolean
  updated_at: string
}

export interface MockDevice {
  device_id: string
  meta: Record<string, string>
  endpoints: { type: string; vendor: string }[]
}

export interface MockDeviceDeployment {
  device_id: string
  deployment_id: string
  version: number
  desired_state: DesiredState
  source: Source
  rule_id: string | null
  generation: number
}

export interface MockExecution {
  id: string
  device_id: string
  deployment_id: string
  version: number
  action: "DEPLOY" | "CLEAR"
  trigger: string
  state: ExecutionState
  attempt: number
  generation: number
  error: string | null
  created_at: string
  applied_at: string | null
}

export interface MockModuleState {
  module_name: string
  image: string
  runtime_status: "running" | "backoff" | "stopped"
  exit_code: number | null
  restart_count: number
}

const runtime: MockDefinition["runtime"] = {
  edge_agent: { image: "mcr.microsoft.com/azureiotedge-agent:1.5", env: {}, create_options: {} },
  edge_hub: { image: "mcr.microsoft.com/azureiotedge-hub:1.5", env: {}, create_options: {}, store_and_forward_ttl_secs: 7200 },
  routes: { toCloud: "FROM /messages/modules/telegraf/* INTO $upstream" },
}

const mod = (name: string, image: string, extra: Partial<MockModule> = {}): MockModule => ({
  name,
  image,
  env: {},
  create_options: {},
  desired_properties: {},
  restart_policy: "always",
  status: "running",
  image_pull_policy: "on-create",
  startup_order: null,
  ...extra,
})

const mosquitto = mod("mosquitto", "eclipse-mosquitto:2.0", {
  create_options: { HostConfig: { PortBindings: { "1883/tcp": [{ HostPort: "1883" }] } } },
  startup_order: 1,
})
const telegraf = (tag: string) =>
  mod("telegraf", `registry.example.com/telegraf:${tag}`, { env: { SITE: "Berlin" }, desired_properties: { interval: 10 }, startup_order: 2 })

const t = (d: string) => `2026-10-${d}:00Z`

const initialDeployments: MockDeployment[] = [
  {
    id: "dep-1",
    name: "line-monitoring",
    type: "IOTEDGE",
    description: "Telegraf + MQTT broker for packaging lines",
    created_at: t("01T09:12"),
    versions: [
      { version: 3, change_note: "telegraf 1.2.0 → 1.3.0", content_hash: "sha256:4b1e…", created_by_name: "Ana", created_at: t("20T14:03"), definition: { runtime, modules: [telegraf("1.3.0"), mosquitto] } },
      { version: 2, change_note: "add mosquitto broker", content_hash: "sha256:a07d…", created_by_name: "Ana", created_at: t("08T11:40"), definition: { runtime, modules: [telegraf("1.2.0"), mosquitto] } },
      { version: 1, change_note: "first version", content_hash: "sha256:9f2c…", created_by_name: "Ana", created_at: t("01T09:15"), definition: { runtime, modules: [telegraf("1.2.0")] } },
    ],
  },
  {
    id: "dep-2",
    name: "vision-inspection",
    type: "IOTEDGE",
    description: "Camera inspection model",
    created_at: t("02T08:00"),
    versions: [
      { version: 1, change_note: "model v7", content_hash: "sha256:c33a…", created_by_name: "Mihai", created_at: t("02T16:21"), definition: { runtime, modules: [mod("inspector", "registry.example.com/inspector:7.0")] } },
    ],
  },
  {
    id: "dep-3",
    name: "landing-page",
    type: "COMPOSE",
    description: "Local web page (Docker Compose)",
    created_at: t("05T10:00"),
    versions: [
      {
        version: 1,
        change_note: "first version",
        content_hash: "sha256:77d0…",
        created_by_name: "Mihai",
        created_at: t("05T10:02"),
        compose_yaml: 'services:\n  web:\n    image: nginx:1.27\n    ports:\n      - "8080:80"\n    restart: always\n',
      },
    ],
  },
]

const initialDevices: MockDevice[] = [
  { device_id: "2206002488", meta: { city: "Berlin", line: "L1" }, endpoints: [{ type: "plc", vendor: "acme" }, { type: "camera", vendor: "optix" }] },
  { device_id: "2206002491", meta: { city: "Berlin", line: "L2" }, endpoints: [{ type: "plc", vendor: "acme" }] },
  { device_id: "2206002517", meta: { city: "Berlin", line: "Test" }, endpoints: [] },
  { device_id: "2206002530", meta: { city: "Munich", line: "L1" }, endpoints: [{ type: "plc", vendor: "acme" }] },
  { device_id: "2206002544", meta: { city: "Munich", line: "L3" }, endpoints: [{ type: "camera", vendor: "optix" }] },
  { device_id: "2206002561", meta: { city: "Kempten", line: "L1" }, endpoints: [{ type: "plc", vendor: "other" }] },
]

const initialRules: MockRule[] = [
  { id: "rule-1", deployment_id: "dep-1", version: 3, expression: { "device.city": ["Berlin"] }, enabled: true, updated_at: t("20T14:05") },
  { id: "rule-2", deployment_id: "dep-2", version: 1, expression: { "endpoint.type": ["camera"], "device.city": ["Munich"] }, enabled: true, updated_at: t("02T16:30") },
]

const initialDeviceDeployments: MockDeviceDeployment[] = [
  { device_id: "2206002488", deployment_id: "dep-1", version: 3, desired_state: "RUNNING", source: "RULE", rule_id: "rule-1", generation: 3 },
  { device_id: "2206002491", deployment_id: "dep-1", version: 3, desired_state: "RUNNING", source: "RULE", rule_id: "rule-1", generation: 3 },
  { device_id: "2206002517", deployment_id: "dep-1", version: 2, desired_state: "RUNNING", source: "MANUAL", rule_id: null, generation: 2 },
  { device_id: "2206002544", deployment_id: "dep-2", version: 1, desired_state: "RUNNING", source: "RULE", rule_id: "rule-2", generation: 1 },
]

const exec = (id: string, device_id: string, deployment_id: string, version: number, state: ExecutionState, trigger: string, created: string, generation: number, error: string | null = null): MockExecution => ({
  id, device_id, deployment_id, version, action: "DEPLOY", trigger, state, attempt: 1, generation, error, created_at: t(created), applied_at: t(created),
})

const initialExecutions: MockExecution[] = [
  exec("ex-12", "2206002491", "dep-1", 3, "FAILED", "rule-1 version changed to v3", "20T14:05", 3, "MODULES_NOT_RUNNING: telegraf backoff (exit code 139) after 15 min"),
  exec("ex-11", "2206002488", "dep-1", 3, "SUCCESS", "rule-1 version changed to v3", "20T14:05", 3),
  exec("ex-9", "2206002517", "dep-1", 2, "SUCCESS", "manual assignment by Ana", "12T09:00", 2),
  exec("ex-7", "2206002544", "dep-2", 1, "SUCCESS", "rule-2 created", "02T16:30", 1),
]

const running = (name: string, image: string): MockModuleState => ({ module_name: name, image, runtime_status: "running", exit_code: null, restart_count: 0 })
const system = [running("edgeAgent", runtime.edge_agent.image), running("edgeHub", runtime.edge_hub.image)]

const initialModuleStates: Record<string, MockModuleState[]> = {
  "2206002488": [...system, running("mosquitto", "eclipse-mosquitto:2.0"), running("telegraf", "registry.example.com/telegraf:1.3.0")],
  "2206002491": [...system, running("mosquitto", "eclipse-mosquitto:2.0"), { module_name: "telegraf", image: "registry.example.com/telegraf:1.3.0", runtime_status: "backoff", exit_code: 139, restart_count: 3 }],
  "2206002517": [...system, running("mosquitto", "eclipse-mosquitto:2.0"), running("telegraf", "registry.example.com/telegraf:1.2.0")],
  "2206002544": [...system, running("inspector", "registry.example.com/inspector:7.0")],
}

// ---------- rule evaluation (mock of the server-side reconcile) ----------

export function matches(device: MockDevice, expression: Expression) {
  const groups: Record<Scope, [string, string[]][]> = { device: [], endpoint: [], service: [] }
  for (const [key, values] of Object.entries(expression)) {
    if (!values.length) continue
    const [scope, field] = key.includes(".") ? (key.split(".") as [Scope, string]) : (["device", key] as [Scope, string])
    groups[scope]?.push([field, values])
  }
  const deviceOk = groups.device.every(([f, v]) => v.includes(device.meta[f] ?? ""))
  const endpointOk =
    groups.endpoint.length === 0 ||
    device.endpoints.some((e) => groups.endpoint.every(([f, v]) => v.includes((e as unknown as Record<string, string>)[f] ?? "")))
  // The mock has no services; any service.* condition matches nothing.
  return deviceOk && endpointOk && groups.service.length === 0
}

export type PlanKind = "ASSIGN" | "UPDATE" | "UNCHANGED" | "TAKEN_FROM" | "SKIPPED_MANUAL" | "REMOVE" | "LOST_TO_NEWER"
export interface PlanRow {
  device_id: string
  kind: PlanKind
  before: MockDeviceDeployment | null
  after: { deployment_id: string; version: number; desired_state: DesiredState; rule_id: string | null } | null
}

interface WorldState {
  devices: MockDevice[]
  rules: MockRule[]
  deviceDeployments: MockDeviceDeployment[]
}

/** Newest enabled matching rule wins; MANUAL is never touched; a device that loses all rules goes ABSENT. */
export function plan(world: WorldState): PlanRow[] {
  const rows: PlanRow[] = []
  for (const device of world.devices) {
    const before = world.deviceDeployments.find((d) => d.device_id === device.device_id) ?? null
    const winner = world.rules
      .filter((r) => r.enabled && matches(device, r.expression))
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0]
    if (before?.source === "MANUAL") {
      if (winner) rows.push({ device_id: device.device_id, kind: "SKIPPED_MANUAL", before, after: null })
      continue
    }
    if (winner) {
      const after = { deployment_id: winner.deployment_id, version: winner.version, desired_state: "RUNNING" as const, rule_id: winner.id }
      let kind: PlanKind = "ASSIGN"
      if (before) {
        const same = before.deployment_id === after.deployment_id && before.version === after.version && before.desired_state === "RUNNING" && before.rule_id === after.rule_id
        kind = same ? "UNCHANGED" : before.deployment_id !== after.deployment_id && before.desired_state === "RUNNING" ? "TAKEN_FROM" : "UPDATE"
      }
      rows.push({ device_id: device.device_id, kind, before, after })
    } else if (before && before.desired_state === "RUNNING") {
      rows.push({ device_id: device.device_id, kind: "REMOVE", before, after: { ...before, desired_state: "ABSENT" } })
    }
  }
  return rows
}

// ---------- store ----------

let seq = 100
const nextId = (p: string) => `${p}-${++seq}`
const now = () => new Date().toISOString()
const FLAKY_DEVICE = "2206002491"

export interface Toast {
  id: number
  text: string
}

interface MockStore extends WorldState {
  deployments: MockDeployment[]
  executions: MockExecution[]
  moduleStates: Record<string, MockModuleState[]>
  events: Toast[]
  addDeployment: (d: Pick<MockDeployment, "name" | "type" | "description">) => string
  addVersion: (deploymentId: string, v: Pick<MockVersion, "change_note" | "definition" | "compose_yaml">) => number
  saveRule: (rule: Omit<MockRule, "id" | "updated_at"> & { id?: string }) => void
  setRuleEnabled: (ruleId: string, enabled: boolean) => void
  deleteRule: (ruleId: string) => void
  setDeviceMeta: (deviceId: string, key: string, value: string) => void
  assignManual: (deviceId: string, deploymentId: string, version: number, state: DesiredState) => void
  releaseToRules: (deviceId: string) => void
  redeliver: (deviceIds: string[]) => void
  tick: () => void
  dismiss: (id: number) => void
}

function queueExecution(s: MockStore, dd: MockDeviceDeployment, trigger: string): MockExecution[] {
  const dep = s.deployments.find((d) => d.id === dd.deployment_id)
  if (dep?.type === "COMPOSE") return s.executions // delivery for Compose comes later
  const executions = s.executions.map((e) =>
    e.device_id === dd.device_id && ["PENDING", "APPLYING", "APPLIED"].includes(e.state) ? { ...e, state: "SUPERSEDED" as const } : e,
  )
  return [
    {
      id: nextId("ex"),
      device_id: dd.device_id,
      deployment_id: dd.deployment_id,
      version: dd.version,
      action: dd.desired_state === "ABSENT" ? "CLEAR" : "DEPLOY",
      trigger,
      state: "PENDING",
      attempt: 1,
      generation: dd.generation,
      error: null,
      created_at: now(),
      applied_at: null,
    },
    ...executions,
  ]
}

function reconcile(s: MockStore, trigger: string): Partial<MockStore> {
  const rows = plan(s).filter((r) => !["UNCHANGED", "SKIPPED_MANUAL"].includes(r.kind))
  let deviceDeployments = [...s.deviceDeployments]
  let executions = s.executions
  for (const row of rows) {
    const before = deviceDeployments.find((d) => d.device_id === row.device_id)
    const dd: MockDeviceDeployment = {
      device_id: row.device_id,
      deployment_id: row.after!.deployment_id,
      version: row.after!.version,
      desired_state: row.after!.desired_state,
      source: "RULE",
      rule_id: row.kind === "REMOVE" ? before?.rule_id ?? null : row.after!.rule_id,
      generation: (before?.generation ?? 0) + 1,
    }
    deviceDeployments = [...deviceDeployments.filter((d) => d.device_id !== row.device_id), dd]
    executions = queueExecution({ ...s, executions }, dd, trigger)
  }
  const text = rows.length
    ? `${trigger}: ${rows.length} device(s) changed (${rows.map((r) => `${r.device_id} ${r.kind.toLowerCase()}`).join(", ")})`
    : `${trigger}: rules re-evaluated, nothing changed`
  return { deviceDeployments, executions, events: [...s.events, { id: ++seq, text }] }
}

function definitionFor(s: { deployments: MockDeployment[] }, deploymentId: string, version: number) {
  return s.deployments.find((d) => d.id === deploymentId)?.versions.find((v) => v.version === version)?.definition
}

export const useMockStore = create<MockStore>((set, get) => ({
  deployments: initialDeployments,
  devices: initialDevices,
  rules: initialRules,
  deviceDeployments: initialDeviceDeployments,
  executions: initialExecutions,
  moduleStates: initialModuleStates,
  events: [],

  addDeployment: (d) => {
    const id = nextId("dep")
    set((s) => ({ deployments: [{ ...d, id, created_at: now(), versions: [] }, ...s.deployments] }))
    return id
  },
  addVersion: (deploymentId, v) => {
    const dep = get().deployments.find((d) => d.id === deploymentId)!
    const version = (dep.versions[0]?.version ?? 0) + 1
    const nv: MockVersion = { ...v, version, content_hash: `sha256:${Math.random().toString(16).slice(2, 6)}…`, created_by_name: "You", created_at: now() }
    set((s) => ({ deployments: s.deployments.map((d) => (d.id === deploymentId ? { ...d, versions: [nv, ...d.versions] } : d)) }))
    return version
  },
  saveRule: (rule) =>
    set((s) => {
      const id = rule.id ?? nextId("rule")
      const saved: MockRule = { ...rule, id, updated_at: now() }
      const rules = rule.id ? s.rules.map((r) => (r.id === id ? saved : r)) : [...s.rules, saved]
      return { rules, ...reconcile({ ...s, rules }, `${id} ${rule.id ? "edited" : "created"}`) }
    }),
  setRuleEnabled: (ruleId, enabled) =>
    set((s) => {
      const rules = s.rules.map((r) => (r.id === ruleId ? { ...r, enabled, updated_at: now() } : r))
      return { rules, ...reconcile({ ...s, rules }, `${ruleId} ${enabled ? "enabled" : "disabled"}`) }
    }),
  deleteRule: (ruleId) =>
    set((s) => {
      const rules = s.rules.filter((r) => r.id !== ruleId)
      return { rules, ...reconcile({ ...s, rules }, `${ruleId} deleted`) }
    }),
  setDeviceMeta: (deviceId, key, value) =>
    set((s) => {
      const devices = s.devices.map((d) => (d.device_id === deviceId ? { ...d, meta: { ...d.meta, [key]: value } } : d))
      return { devices, ...reconcile({ ...s, devices }, `device ${deviceId}: ${key} changed to ${value}`) }
    }),
  assignManual: (deviceId, deploymentId, version, state) =>
    set((s) => {
      const before = s.deviceDeployments.find((d) => d.device_id === deviceId)
      const dd: MockDeviceDeployment = { device_id: deviceId, deployment_id: deploymentId, version, desired_state: state, source: "MANUAL", rule_id: null, generation: (before?.generation ?? 0) + 1 }
      const label = state === "ABSENT" ? "manual clear" : "manual assignment"
      return {
        deviceDeployments: [...s.deviceDeployments.filter((d) => d.device_id !== deviceId), dd],
        executions: queueExecution(s, dd, `${label} by You`),
        events: [...s.events, { id: ++seq, text: `${deviceId}: ${label} (rules no longer touch this device)` }],
      }
    }),
  releaseToRules: (deviceId) =>
    set((s) => {
      const deviceDeployments = s.deviceDeployments.map((d) => (d.device_id === deviceId ? { ...d, source: "RULE" as const } : d))
      return { deviceDeployments, ...reconcile({ ...s, deviceDeployments }, `${deviceId} released to rules`) }
    }),
  redeliver: (deviceIds) =>
    set((s) => {
      let executions = s.executions
      for (const id of deviceIds) {
        const dd = s.deviceDeployments.find((d) => d.device_id === id)
        if (dd) executions = queueExecution({ ...s, executions }, dd, "redeliver by You")
      }
      return { executions, events: [...s.events, { id: ++seq, text: `Redeliver queued for ${deviceIds.length} device(s)` }] }
    }),
  tick: () =>
    set((s) => {
      let moduleStates = s.moduleStates
      let picked = false
      const executions = s.executions.map((e) => {
        if (e.state === "APPLYING") return { ...e, state: "APPLIED" as const, applied_at: now() }
        if (e.state === "APPLIED") {
          const redelivered = e.trigger.startsWith("redeliver")
          if (e.device_id === FLAKY_DEVICE && e.action === "DEPLOY" && !redelivered) {
            return { ...e, state: "FAILED" as const, error: "MODULES_NOT_RUNNING: telegraf backoff (exit code 139) after 15 min" }
          }
          const def = definitionFor(s, e.deployment_id, e.version)
          const mods = e.action === "CLEAR" || !def ? [] : def.modules.map((m) => running(m.name, m.image))
          moduleStates = { ...moduleStates, [e.device_id]: [...system, ...mods] }
          return { ...e, state: "SUCCESS" as const }
        }
        if (e.state === "PENDING" && !picked) {
          picked = true
          return { ...e, state: "APPLYING" as const }
        }
        return e
      })
      return { executions, moduleStates }
    }),
  dismiss: (id) => set((s) => ({ events: s.events.filter((e) => e.id !== id) })),
}))

// ---------- helpers ----------

export function deviceStatus(s: Pick<MockStore, "executions" | "deviceDeployments">, deviceId: string) {
  const dd = s.deviceDeployments.find((d) => d.device_id === deviceId)
  if (!dd) return null
  const last = s.executions.find((e) => e.device_id === deviceId && e.state !== "SUPERSEDED")
  if (dd.desired_state === "ABSENT" && (!last || last.state === "SUCCESS")) return "ABSENT"
  if (!last || last.generation !== dd.generation) return "PENDING"
  return last.state === "SUCCESS" ? "IN_SYNC" : last.state === "FAILED" ? "FAILED" : "PENDING"
}

/** Mock of the IoT Edge manifest builder, enough to show the shape. */
export function buildManifest(def: MockDefinition, clear = false) {
  const env = (e: Record<string, string>) =>
    Object.keys(e).length ? Object.fromEntries(Object.entries(e).map(([k, v]) => [k, { value: v }])) : undefined
  const modules = clear ? [] : def.modules
  const content: Record<string, unknown> = {
    $edgeAgent: {
      "properties.desired": {
        schemaVersion: "1.1",
        runtime: { type: "docker", settings: { registryCredentials: { registry: { address: "registry.example.com", username: "pull", password: "***" } } } },
        systemModules: {
          edgeAgent: { type: "docker", settings: { image: def.runtime.edge_agent.image, createOptions: JSON.stringify(def.runtime.edge_agent.create_options) }, env: env(def.runtime.edge_agent.env) },
          edgeHub: { type: "docker", status: "running", restartPolicy: "always", settings: { image: def.runtime.edge_hub.image, createOptions: JSON.stringify(def.runtime.edge_hub.create_options) }, env: env(def.runtime.edge_hub.env) },
        },
        modules: Object.fromEntries(
          modules.map((m) => [
            m.name,
            {
              type: "docker",
              version: "1.0",
              status: m.status,
              restartPolicy: m.restart_policy,
              imagePullPolicy: m.image_pull_policy,
              ...(m.startup_order != null ? { startupOrder: m.startup_order } : {}),
              settings: { image: m.image, createOptions: JSON.stringify(m.create_options) },
              env: env(m.env),
            },
          ]),
        ),
      },
    },
    $edgeHub: {
      "properties.desired": {
        schemaVersion: "1.1",
        routes: clear ? {} : def.runtime.routes,
        storeAndForwardConfiguration: { timeToLiveSecs: def.runtime.edge_hub.store_and_forward_ttl_secs },
      },
    },
  }
  for (const m of modules) if (Object.keys(m.desired_properties).length) content[m.name] = { "properties.desired": m.desired_properties }
  return { modulesContent: content }
}

export const emptyRuntime = runtime

export function fmt(iso: string | null) {
  if (!iso) return "–"
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
}
