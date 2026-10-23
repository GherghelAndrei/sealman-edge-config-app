import { useEffect, type ReactNode } from "react"
import { Link, NavLink, Outlet } from "react-router-dom"
import { FlaskConical, X, Zap } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { useMockStore, type DeploymentType, type Expression, type ExecutionState, type PlanKind } from "./mockData"

/** Shell for all mockup pages: banner, sub-navigation, the simulated worker and the reconcile event feed. */
export function MockLayout() {
  const tick = useMockStore((s) => s.tick)
  const events = useMockStore((s) => s.events)
  const dismiss = useMockStore((s) => s.dismiss)

  useEffect(() => {
    const timer = setInterval(tick, 1500)
    return () => clearInterval(timer)
  }, [tick])

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-4 bg-amber-100 border-b border-amber-300 px-4 py-1.5 text-xs text-amber-900">
        <span className="flex items-center gap-1.5">
          <FlaskConical className="h-3.5 w-3.5" />
          Mockup – in-memory demo data, resets on reload. Nothing is sent to devices.
        </span>
        <nav className="flex gap-3 ml-auto">
          {[
            { to: "/mockups/deployments", label: "Deployments" },
            { to: "/mockups/devices", label: "Devices" },
          ].map((l) => (
            <NavLink key={l.to} to={l.to} className={({ isActive }) => cn("hover:underline", isActive && "font-semibold underline")}>
              {l.label}
            </NavLink>
          ))}
        </nav>
      </div>
      <div className="flex-1 min-h-0">
        <Outlet />
      </div>
      <div className="fixed bottom-4 left-4 z-50 flex w-[28rem] flex-col gap-2">
        {events.slice(-3).map((e) => (
          <div key={e.id} className="flex items-start gap-2 rounded-md border border-indigo-200 bg-indigo-50 p-2.5 text-xs text-indigo-900 shadow">
            <Zap className="h-4 w-4 shrink-0" />
            <span className="flex-1">
              {e.text}
            </span>
            <button onClick={() => dismiss(e.id)} aria-label="dismiss">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export function MockPage({
  title,
  subtitle,
  crumbs = [],
  actions,
  children,
}: {
  title: ReactNode
  subtitle?: ReactNode
  crumbs?: { label: string; to: string }[]
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between gap-4 px-4 py-3 border-b bg-vibrant-blue text-white">
        <div>
          {crumbs.length > 0 && (
            <div className="text-xs text-white/70 mb-0.5">
              {crumbs.map((c, i) => (
                <span key={c.to}>
                  {i > 0 && " / "}
                  <Link to={c.to} className="hover:underline">
                    {c.label}
                  </Link>
                </span>
              ))}
            </div>
          )}
          <div className="text-lg font-semibold">{title}</div>
          {subtitle && <div className="text-xs text-white/80">{subtitle}</div>}
        </div>
        <div className="flex items-center gap-2">{actions}</div>
      </div>
      <div className="flex-1 overflow-auto p-4 space-y-4">{children}</div>
    </div>
  )
}

const executionColors: Record<ExecutionState, string> = {
  PENDING: "bg-gray-100 text-gray-700 border-gray-300",
  APPLYING: "bg-blue-100 text-blue-800 border-blue-300",
  APPLIED: "bg-indigo-100 text-indigo-800 border-indigo-300",
  SUCCESS: "bg-green-100 text-green-800 border-green-300",
  FAILED: "bg-red-100 text-red-800 border-red-300",
  SUPERSEDED: "bg-gray-100 text-gray-500 border-gray-200 line-through",
}

const executionHints: Record<ExecutionState, string> = {
  PENDING: "Waiting for the worker",
  APPLYING: "Sending the manifest to IoT Hub",
  APPLIED: "IoT Hub accepted it; waiting for the device to report",
  SUCCESS: "Device accepted it and all modules run",
  FAILED: "Hub error, device rejected it, or modules not running after 15 min",
  SUPERSEDED: "A newer change for this device replaced it",
}

export function ExecutionBadge({ state }: { state: ExecutionState }) {
  return (
    <Badge variant="outline" title={executionHints[state]} className={cn("font-medium", executionColors[state])}>
      {state}
    </Badge>
  )
}

export function SyncBadge({ status }: { status: "IN_SYNC" | "PENDING" | "FAILED" | "ABSENT" | null }) {
  if (!status) return <span className="text-muted-foreground text-xs">–</span>
  const cls = {
    IN_SYNC: "bg-green-100 text-green-800 border-green-300",
    PENDING: "bg-indigo-100 text-indigo-800 border-indigo-300",
    FAILED: "bg-red-100 text-red-800 border-red-300",
    ABSENT: "bg-gray-100 text-gray-600 border-gray-300",
  }[status]
  return (
    <Badge variant="outline" className={cn("font-medium", cls)}>
      {status.replace("_", " ")}
    </Badge>
  )
}

export function SourceBadge({ source, ruleId }: { source: "RULE" | "MANUAL"; ruleId?: string | null }) {
  return (
    <Badge
      variant="outline"
      className={cn("font-medium", source === "MANUAL" ? "bg-amber-50 text-amber-800 border-amber-300" : "bg-sky-50 text-sky-800 border-sky-300")}
    >
      {source === "MANUAL" ? "MANUAL" : `RULE ${ruleId ?? ""}`}
    </Badge>
  )
}

const planLabels: Record<PlanKind, { label: string; cls: string }> = {
  ASSIGN: { label: "will get it", cls: "text-green-700" },
  UPDATE: { label: "will be updated", cls: "text-green-700" },
  UNCHANGED: { label: "unchanged", cls: "text-muted-foreground" },
  TAKEN_FROM: { label: "taken from its current deployment (newest rule wins)", cls: "text-amber-700" },
  SKIPPED_MANUAL: { label: "skipped – manually assigned", cls: "text-muted-foreground" },
  REMOVE: { label: "no longer matches → cleared (ABSENT)", cls: "text-red-700" },
  LOST_TO_NEWER: { label: "goes to a newer rule", cls: "text-amber-700" },
}

export function PlanLabel({ kind }: { kind: PlanKind }) {
  const p = planLabels[kind]
  return <span className={cn("text-xs font-medium", p.cls)}>{p.label}</span>
}

export function ExpressionChips({ expression }: { expression: Expression }) {
  const entries = Object.entries(expression).filter(([, v]) => v.length)
  if (!entries.length) return <span className="text-muted-foreground">all devices</span>
  return (
    <span className="inline-flex flex-wrap gap-1">
      {entries.map(([k, v], i) => (
        <span key={k} className="inline-flex items-center gap-1">
          {i > 0 && <span className="text-[10px] text-muted-foreground">AND</span>}
          <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">
            {k} = {v.join(" | ")}
          </code>
        </span>
      ))}
    </span>
  )
}

export function JsonDialog({
  open,
  onOpenChange,
  title,
  description,
  value,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  value: unknown
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <pre className="max-h-[65vh] overflow-auto rounded bg-gray-950 p-3 text-xs text-green-200">
          {typeof value === "string" ? value : JSON.stringify(value, null, 2)}
        </pre>
      </DialogContent>
    </Dialog>
  )
}

export function Section({ title, description, actions, children }: { title: string; description?: ReactNode; actions?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-md border bg-white">
      <div className="flex items-center justify-between gap-2 border-b px-4 py-2.5">
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
        <div className="flex items-center gap-2">{actions}</div>
      </div>
      <div className="p-4">{children}</div>
    </section>
  )
}

export function DeviceLink({ id }: { id: string }) {
  return (
    <Link className="text-vibrant-blue hover:underline" to={`/mockups/devices/${id}`}>
      {id}
    </Link>
  )
}

export function TypeBadge({ type }: { type: DeploymentType }) {
  return (
    <Badge variant="outline" className={type === "IOTEDGE" ? "bg-blue-50 text-blue-800 border-blue-300" : "bg-purple-50 text-purple-800 border-purple-300"}>
      {type === "IOTEDGE" ? "IoT Edge" : "Compose"}
    </Badge>
  )
}
