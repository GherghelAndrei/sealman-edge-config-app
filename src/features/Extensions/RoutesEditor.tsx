import { Plus, X } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { emptyQueryParam, emptyRoute, HTTP_METHODS, type ActionDraft, type QueryParamDraft, type RouteDraft, type UpstreamDraft } from "./extensionFormTypes";
import { HttpMethodBadge } from "./HttpMethodBadge";
import { FieldHint } from "./FieldHint";
import { coerceScopeParam, HighlightedPath, PathHighlightInput, scopeParamChoices } from "./pathParams";

function QueryParamsEditor({ params, onChange }: { params: QueryParamDraft[]; onChange: (p: QueryParamDraft[]) => void }) {
  function update(id: string, patch: Partial<QueryParamDraft>) {
    onChange(params.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }
  function remove(id: string) {
    onChange(params.filter((p) => p.id !== id));
  }
  return (
    <div className="space-y-2">
      {params.map((p) => (
        <div key={p.id} className="flex gap-2 items-center">
          <Input placeholder="name" className="w-32" value={p.name} onChange={(e) => update(p.id, { name: e.target.value })} />
          <Select value={p.type} onValueChange={(v) => update(p.id, { type: v as QueryParamDraft["type"] })}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="string">string</SelectItem>
              <SelectItem value="integer">integer</SelectItem>
              <SelectItem value="number">number</SelectItem>
              <SelectItem value="boolean">boolean</SelectItem>
            </SelectContent>
          </Select>
          <Input placeholder="Description (optional)" value={p.description} onChange={(e) => update(p.id, { description: e.target.value })} />
          <div className="flex items-center gap-1.5 shrink-0">
            <Switch checked={p.required} onCheckedChange={(v) => update(p.id, { required: v })} />
            <span className="text-xs text-muted-foreground">required</span>
          </div>
          <Button type="button" size="icon" variant="ghost" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => remove(p.id)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...params, emptyQueryParam()])}>
        <Plus className="h-3.5 w-3.5 mr-1" /> Add query param
      </Button>
    </div>
  );
}

interface RoutesEditorProps {
  routes: RouteDraft[];
  upstreams: UpstreamDraft[];
  actions: ActionDraft[];
  onChange: (routes: RouteDraft[]) => void;
}

const NO_ACTION = "__none__";

export function RoutesEditor({ routes, upstreams, actions, onChange }: RoutesEditorProps) {
  function update(id: string, patch: Partial<RouteDraft>) {
    onChange(routes.map((r) => (r.id === id ? coerceScopeParam({ ...r, ...patch }) : r)));
  }
  function remove(id: string) {
    onChange(routes.filter((r) => r.id !== id));
  }
  function add() {
    onChange([...routes, emptyRoute(upstreams[0]?.key ?? "")]);
  }

  if (upstreams.length === 0) {
    return <p className="text-sm text-muted-foreground italic">Add an upstream first - every route belongs to one.</p>;
  }

  return (
    <div className="space-y-3">
      <Accordion type="multiple" className="space-y-2">
        {routes.map((r, idx) => {
          const upstream = upstreams.find((u) => u.key === r.upstream);
          return (
            <AccordionItem key={r.id} value={r.id} className="rounded-md border px-3">
              <div className="flex items-center gap-2">
                <AccordionTrigger className="flex-1 py-3">
                  <HttpMethodBadge method={r.method} className="mr-2" />
                  {r.path.trim() ? <HighlightedPath path={r.path} /> : <span>{`route #${idx + 1}`}</span>}
                </AccordionTrigger>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    remove(r.id);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <AccordionContent className="space-y-3 px-0.5">
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label>Upstream</Label>
                    <Select value={r.upstream} onValueChange={(v) => update(r.id, { upstream: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {upstreams.map((u) => (
                          <SelectItem key={u.id} value={u.key} disabled={!u.key}>
                            {u.key || "(unnamed)"} - {u.type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Method</Label>
                    <Select value={r.method} onValueChange={(v) => update(r.id, { method: v as RouteDraft["method"] })}>
                      <SelectTrigger>
                        <HttpMethodBadge method={r.method} />
                      </SelectTrigger>
                      <SelectContent>
                        {HTTP_METHODS.map((m) => (
                          <SelectItem
                            key={m}
                            value={m}
                            className="p-1.5 border border-transparent focus:bg-transparent focus:text-foreground data-[highlighted]:bg-transparent data-[highlighted]:border-foreground/25"
                          >
                            <HttpMethodBadge method={m} />
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Visibility</Label>
                    <Select value={r.visibility} onValueChange={(v) => update(r.id, { visibility: v as RouteDraft["visibility"] })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">public</SelectItem>
                        <SelectItem value="internal">internal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Path</Label>
                  <PathHighlightInput placeholder="/widgets/{widget_id}" value={r.path} onChange={(path) => update(r.id, { path })} />
                </div>

                {upstream?.type === "http" && (
                  <div className="space-y-1.5">
                    <Label>Upstream path <span className="text-muted-foreground font-normal">(path forwarded to the upstream service, defaults to the route path)</span></Label>
                    <PathHighlightInput placeholder="/api/widgets/{widget_id}" value={r.upstream_path} onChange={(upstream_path) => update(r.id, { upstream_path })} />
                  </div>
                )}

                {upstream?.type === "iotedge" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>IoT Edge operation</Label>
                      <Select value={r.iotedge_operation} onValueChange={(v) => update(r.id, { iotedge_operation: v as RouteDraft["iotedge_operation"] })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="direct_method">direct_method</SelectItem>
                          <SelectItem value="twin_read">twin_read</SelectItem>
                          <SelectItem value="twin_write">twin_write</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {r.iotedge_operation === "direct_method" && (
                      <div className="space-y-1.5">
                        <Label>Method name</Label>
                        <Input placeholder="restart" value={r.iotedge_method_name} onChange={(e) => update(r.id, { iotedge_method_name: e.target.value })} />
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label>Required action <span className="text-muted-foreground font-normal">(optional RBAC action gating this public route)</span></Label>
                  <Select
                    value={r.required_action || NO_ACTION}
                    onValueChange={(v) => update(r.id, { required_action: v === NO_ACTION ? "" : v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="None - any authenticated user" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_ACTION}>None - any authenticated user</SelectItem>
                      {Array.from(new Set([
                        ...actions.map((a) => a.name.trim()).filter(Boolean),
                        ...(r.required_action.trim() ? [r.required_action.trim()] : []),
                      ])).map((name) => (
                        <SelectItem key={name} value={name}>{name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="mb-1.5 block">Query parameters</Label>
                  <QueryParamsEditor params={r.query_params} onChange={(p) => update(r.id, { query_params: p })} />
                </div>

                <div className="space-y-3 rounded-md border bg-muted/20 p-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    <FieldHint
                      label="Device scope"
                      tip="Not an Authorization scope name. When on, the request parameter named below must carry a devices.device_id (IoT Hub id). ABAC then checks that device against the caller's team scopes. The parameter name is only a path/query alias."
                    />
                  </p>
                  <div className="flex items-center gap-1.5">
                    <Switch checked={r.scoped} onCheckedChange={(v) => update(r.id, { scoped: v })} />
                    <span className="text-sm">Device-scoped (ABAC checks one device)</span>
                  </div>
                  {r.scoped && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label>
                          <FieldHint
                            label="Device id parameter"
                            tip="Which request parameter holds devices.device_id. Path: a {placeholder} on the public path. Query: a declared query param. This is not the name of a Scope object under Authorization."
                          />
                        </Label>
                        {(() => {
                          const choices = scopeParamChoices(r);
                          const current = r.scope_param.trim();
                          return choices.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                              {r.scope_in === "path"
                                ? "Add a {placeholder} to the path first."
                                : "Add a query parameter first, or switch location to path."}
                            </p>
                          ) : (
                            <Select
                              value={choices.includes(current) ? current : choices[0]}
                              onValueChange={(v) => update(r.id, { scope_param: v })}
                            >
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {choices.map((name) => (
                                  <SelectItem key={name} value={name}>{name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          );
                        })()}
                      </div>
                      <div className="space-y-1.5">
                        <Label>Scope location</Label>
                        <Select
                          value={r.scope_in}
                          onValueChange={(v) => update(r.id, { scope_in: v as RouteDraft["scope_in"] })}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="query">query</SelectItem>
                            <SelectItem value="path">path</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-3 rounded-md border bg-muted/20 p-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">OpenAPI docs</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Summary</Label>
                      <Input value={r.summary} onChange={(e) => update(r.id, { summary: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Tags <span className="text-muted-foreground font-normal">(Swagger groups - extra sections in /docs)</span></Label>
                      <Input value={r.tags} onChange={(e) => update(r.id, { tags: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Description</Label>
                    <Textarea rows={2} value={r.description} onChange={(e) => update(r.id, { description: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-3 items-end">
                    <div className="space-y-1.5">
                      <Label>Status code</Label>
                      <Input value={r.status_code} onChange={(e) => update(r.id, { status_code: e.target.value })} />
                    </div>
                    <div className="flex items-center gap-1.5 pb-2">
                      <Switch checked={r.deprecated} onCheckedChange={(v) => update(r.id, { deprecated: v })} />
                      <span className="text-sm">Deprecated</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 rounded-md border bg-muted/20 p-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Request body</p>
                  {upstream?.type === "http" && (
                    <div className="flex items-center gap-1.5">
                      <Switch checked={r.body_ref} onCheckedChange={(v) => update(r.id, { body_ref: v })} />
                      <span className="text-sm">Use the upstream's own OpenAPI schema</span>
                    </div>
                  )}

                  {!r.body_ref && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label>Body JSON Schema <span className="text-muted-foreground font-normal">(optional)</span></Label>
                        <Textarea
                          rows={5}
                          className="font-mono text-xs"
                          placeholder={'{\n  "type": "object",\n  "properties": { "name": { "type": "string" } },\n  "required": ["name"]\n}'}
                          value={r.bodyText}
                          onChange={(e) => update(r.id, { bodyText: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Example <span className="text-muted-foreground font-normal">(optional, validated against the schema)</span></Label>
                        <Textarea
                          rows={5}
                          className="font-mono text-xs"
                          placeholder={'{\n  "name": "example"\n}'}
                          value={r.exampleText}
                          onChange={(e) => update(r.id, { exampleText: e.target.value })}
                        />
                      </div>
                    </div>
                  )}
                  {r.body_ref && (
                    <p className="text-sm text-amber-800">
                      Warning: the platform will not validate this body. The upstream service must. If its OpenAPI doc cannot be fetched, the route is stored as unreachable_ref until you disable and enable the extension (or restart the API), which refetches the schema. unreachable_ref is not a value you can set in the registration file.
                    </p>
                  )}
                  {!r.body_ref && !r.bodyText.trim() && (
                    <p className="text-sm text-amber-800">
                      Warning: with no JSON Schema, the platform will not validate this body.
                    </p>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
      <Button type="button" variant="outline" size="sm" onClick={add}>
        <Plus className="h-3.5 w-3.5 mr-1" /> Add route
      </Button>
    </div>
  );
}
