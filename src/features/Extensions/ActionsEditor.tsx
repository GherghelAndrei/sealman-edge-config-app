import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { emptyAction, type ActionDraft } from "./extensionFormTypes";

interface ActionsEditorProps {
  actions: ActionDraft[];
  onChange: (actions: ActionDraft[]) => void;
}

export function ActionsEditor({ actions, onChange }: ActionsEditorProps) {
  function update(id: string, patch: Partial<ActionDraft>) {
    onChange(actions.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  }
  function remove(id: string) {
    onChange(actions.filter((a) => a.id !== id));
  }
  function add() {
    onChange([...actions, emptyAction()]);
  }

  return (
    <div className="space-y-2">
      {actions.map((a) => (
        <div key={a.id} className="flex gap-2 items-center">
          <Input placeholder="action.name (e.g. myext.read)" value={a.name} onChange={(e) => update(a.id, { name: e.target.value })} />
          <Input placeholder="Description (optional)" value={a.description} onChange={(e) => update(a.id, { description: e.target.value })} />
          <Button type="button" size="icon" variant="ghost" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => remove(a.id)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={add}>
        <Plus className="h-3.5 w-3.5 mr-1" /> Add action
      </Button>
    </div>
  );
}
