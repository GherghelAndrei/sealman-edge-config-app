import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ExtensionFieldSet } from "@/generated/edge-administration/hooks/extension_fields/useGetExtensionFields";
import { offeredFieldSets, type OfferedFieldSet } from "./extensionFieldsOffer";

export interface ExtensionFieldsPickerProps {
  /** The extensions whose fields can be picked; disabled ones are not offered. */
  fieldSets: ExtensionFieldSet[];
  /** Keys not offered, e.g. the keys a type being edited already has. */
  excludeKeys: Set<string>;
  /** Ticked extensions as {extension: [its offered keys]}. */
  value: Record<string, string[]>;
  /** Gets the new selection. Ticking an extension adds all its offered keys (in declaration
   * order); unticking it leaves the extension out, because the API rejects an extension listed
   * with an empty key list. */
  onChange: (value: Record<string, string[]>) => void;
}

/** The "Additional fields" section of the type dialogs: one row per extension that has fields to
 * offer, with a checkbox that adds all of them and a toggle that shows them read-only. Renders
 * nothing when no field is left to offer. */
export default function ExtensionFieldsPicker({ fieldSets, excludeKeys, value, onChange }: ExtensionFieldsPickerProps) {
  const offered = offeredFieldSets(fieldSets, excludeKeys);

  if (offered.length === 0) return null;

  // Built with entries, not by assigning keys, so an extension named e.g. "__proto__" or
  // "constructor" is handled like any other name.
  const toggle = (extension: string, offeredKeys: string[]) => {
    const others = Object.entries(value).filter(([name]) => name !== extension);
    onChange(Object.fromEntries(Object.hasOwn(value, extension) ? others : [...others, [extension, offeredKeys]]));
  };

  return (
    <div>
      <h3 className="text-sm font-semibold mb-2">Additional fields</h3>
      <div className="border rounded-md">
        {offered.map((set) => (
          <ExtensionRow
            key={set.extension}
            fieldSet={set}
            checked={Object.hasOwn(value, set.extension)}
            onToggle={() => toggle(set.extension, set.fields.map(([key]) => key))}
          />
        ))}
      </div>
    </div>
  );
}

function ExtensionRow({ fieldSet, checked, onToggle }: { fieldSet: OfferedFieldSet; checked: boolean; onToggle: () => void }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { extension, fields } = fieldSet;
  const listId = `extension-fields-${extension}`;

  return (
    <div role="group" aria-label={extension} className="border-b last:border-b-0">
      <div className="flex items-center gap-4 px-4 py-3">
        <label className="flex flex-1 min-w-0 items-baseline gap-x-3 text-sm">
          <input type="checkbox" className="self-center" checked={checked} onChange={onToggle} />
          <span className="font-mono font-medium">{extension}</span>{" "}
          <span className="text-muted-foreground">{fields.length} field(s)</span>
        </label>
        <button
          type="button"
          aria-label={`Show ${extension} fields`}
          aria-expanded={isExpanded}
          aria-controls={listId}
          onClick={() => setIsExpanded((open) => !open)}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground shrink-0"
        >
          Show fields
          <ChevronDown
            aria-hidden="true"
            className={cn("h-4 w-4 transition-transform duration-200", isExpanded && "rotate-180")}
          />
        </button>
      </div>
      <ul id={listId} hidden={!isExpanded} aria-label={`${extension} fields`} className="px-4 pb-3 space-y-1 text-sm">
        {fields.map(([key, definition]) => (
          <li key={key} className="flex items-baseline gap-3">
            <span className="font-medium">{definition.label}</span>
            <span className="font-mono text-xs text-muted-foreground">{key}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
