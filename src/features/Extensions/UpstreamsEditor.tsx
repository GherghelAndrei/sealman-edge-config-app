import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { emptyUpstream, type UpstreamDraft } from "./extensionFormTypes";
import { FieldHint } from "./FieldHint";

interface UpstreamsEditorProps {
  upstreams: UpstreamDraft[];
  onChange: (upstreams: UpstreamDraft[]) => void;
}

export function UpstreamsEditor({ upstreams, onChange }: UpstreamsEditorProps) {
  function update(id: string, patch: Partial<UpstreamDraft>) {
    onChange(upstreams.map((u) => (u.id === id ? { ...u, ...patch } : u)));
  }
  function remove(id: string) {
    onChange(upstreams.filter((u) => u.id !== id));
  }
  function add() {
    onChange([...upstreams, emptyUpstream()]);
  }

  return (
    <div className="space-y-3">
      {upstreams.length === 0 && (
        <p className="text-sm text-muted-foreground italic">No upstreams yet - add at least one before adding routes.</p>
      )}
      {upstreams.map((u) => (
        <div key={u.id} className="rounded-md border p-3 space-y-3">
          <div className="flex items-start gap-2">
            <div className="grid grid-cols-2 gap-3 flex-1">
              <div className="space-y-1.5">
                <Label>
                  <FieldHint
                    label="Name"
                    tip="Local alias for this backend inside the extension (the JSON object key under upstreams). Routes pick this name. It is not a secret and not the extension name."
                  />
                </Label>
                <Input
                  placeholder="catalog"
                  value={u.key}
                  onChange={(e) => update(u.id, { key: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={u.type} onValueChange={(v) => update(u.id, { type: v as UpstreamDraft["type"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="http">http</SelectItem>
                    <SelectItem value="iotedge">iotedge</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button type="button" size="icon" variant="ghost" className="h-8 w-8 shrink-0 mt-6 text-muted-foreground hover:text-destructive" onClick={() => remove(u.id)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {u.type === "http" ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label>Base URL</Label>
                <Input placeholder="http://my-extension-service:8080" value={u.base_url} onChange={(e) => update(u.id, { base_url: e.target.value })} />
              </div>
              <div className="col-span-2 space-y-3 rounded-md border bg-muted/20 p-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Health check</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Health path</Label>
                    <Input placeholder="/health" value={u.health_path} onChange={(e) => update(u.id, { health_path: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>
                      Health-check version key{" "}
                      <span className="text-muted-foreground font-normal">(JSON key in the health response)</span>
                    </Label>
                    <Input placeholder="version" value={u.version_field} onChange={(e) => update(u.id, { version_field: e.target.value })} />
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <Label>Expected version <span className="text-muted-foreground font-normal">(optional, semver/PEP 440 specifier)</span></Label>
                    <Input placeholder=">=1.0.0" value={u.expected_version} onChange={(e) => update(u.id, { expected_version: e.target.value })} />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label>Module name</Label>
                <Input placeholder="my-edge-module" value={u.module_name} onChange={(e) => update(u.id, { module_name: e.target.value })} />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Health device query <span className="text-muted-foreground font-normal">(optional canary device query)</span></Label>
                <Input placeholder="tags.module='my-edge-module'" value={u.health_device_query} onChange={(e) => update(u.id, { health_device_query: e.target.value })} />
              </div>
            </div>
          )}
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={add}>
        <Plus className="h-3.5 w-3.5 mr-1" /> Add upstream
      </Button>
    </div>
  );
}
