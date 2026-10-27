import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ActionsEditor } from "./ActionsEditor";
import { RoutesEditor } from "./RoutesEditor";
import { UpstreamsEditor } from "./UpstreamsEditor";
import type { ExtensionFormDraft } from "./extensionFormTypes";

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{children}</p>;
}

interface ExtensionFormFieldsProps {
  draft: ExtensionFormDraft;
  onChange: (draft: ExtensionFormDraft) => void;
  /** Locks the name field, since renaming an already-registered extension isn't supported. */
  nameLocked?: boolean;
}

/** The extension registration/edit form body - shared between the full-page "register new"
 * flow and the "edit extension" dialog so both stay in sync. */
export function ExtensionFormFields({ draft, onChange, nameLocked }: ExtensionFormFieldsProps) {
  return (
    <div className="space-y-6">
      <section>
        <SectionLabel>Basic</SectionLabel>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input
              placeholder="my-extension"
              value={draft.name}
              disabled={nameLocked}
              onChange={(e) => onChange({ ...draft, name: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Input
              placeholder="What does this extension do?"
              value={draft.description}
              onChange={(e) => onChange({ ...draft, description: e.target.value })}
            />
          </div>
        </div>
      </section>

      <section>
        <SectionLabel>Upstreams</SectionLabel>
        <UpstreamsEditor upstreams={draft.upstreams} onChange={(upstreams) => onChange({ ...draft, upstreams })} />
      </section>

      <section>
        <SectionLabel>RBAC actions</SectionLabel>
        <ActionsEditor actions={draft.actions} onChange={(actions) => onChange({ ...draft, actions })} />
      </section>

      <section>
        <SectionLabel>Routes</SectionLabel>
        <RoutesEditor
          routes={draft.routes}
          upstreams={draft.upstreams}
          actions={draft.actions}
          onChange={(routes) => onChange({ ...draft, routes })}
        />
      </section>
    </div>
  );
}
