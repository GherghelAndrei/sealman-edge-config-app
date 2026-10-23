import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { MockPage, TypeBadge } from "./components"
import { fmt, useMockStore, type DeploymentType } from "./mockData"

const typeInfo: Record<DeploymentType, { title: string; text: string }> = {
  IOTEDGE: { title: "IoT Edge (IoT Hub)", text: "Build modules in a form, like IoT Manager. Sealman builds the IoT Edge manifest and applies it per device." },
  COMPOSE: { title: "Docker Compose", text: "Paste a docker-compose YAML. Stored and targeted with rules; delivery to devices comes later." },
}

export default function MockDeploymentsList() {
  const navigate = useNavigate()
  const { deployments, rules, deviceDeployments, addDeployment } = useMockStore()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [type, setType] = useState<DeploymentType>("IOTEDGE")

  const create = () => {
    const id = addDeployment({ name, type, description })
    setOpen(false)
    navigate(`/mockups/deployments/${id}/versions/new`)
  }

  return (
    <MockPage
      title="Deployments"
      subtitle="What can run on a device. Versions are immutable; target rules decide which devices get which version."
      actions={
        <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          New deployment
        </Button>
      }
    >
      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Latest version</TableHead>
              <TableHead>Rules</TableHead>
              <TableHead>Devices running it</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deployments.map((d) => (
              <TableRow key={d.id} className="cursor-pointer" onClick={() => navigate(`/mockups/deployments/${d.id}`)}>
                <TableCell className="font-medium">{d.name}</TableCell>
                <TableCell>
                  <TypeBadge type={d.type} />
                </TableCell>
                <TableCell className="text-muted-foreground">{d.description}</TableCell>
                <TableCell>{d.versions[0] ? `v${d.versions[0].version}` : "–"}</TableCell>
                <TableCell>{rules.filter((r) => r.deployment_id === d.id && r.enabled).length}</TableCell>
                <TableCell>{deviceDeployments.filter((x) => x.deployment_id === d.id && x.desired_state === "RUNNING").length}</TableCell>
                <TableCell>{fmt(d.created_at)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New deployment</DialogTitle>
            <DialogDescription>Choose the type; you add version 1 in the next step.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(typeInfo) as DeploymentType[]).map((k) => (
                <button
                  key={k}
                  onClick={() => setType(k)}
                  className={cn("rounded-md border p-3 text-left", type === k ? "border-vibrant-blue ring-1 ring-vibrant-blue" : "hover:bg-gray-50")}
                >
                  <div className="text-sm font-semibold">{typeInfo[k].title}</div>
                  <div className="text-xs text-muted-foreground mt-1">{typeInfo[k].text}</div>
                </button>
              ))}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="mock-name">Name</Label>
              <Input id="mock-name" placeholder="line-monitoring" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="mock-desc">
                Description <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Textarea id="mock-desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button disabled={!name.trim()} onClick={create}>
              Create and add version 1
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MockPage>
  )
}
