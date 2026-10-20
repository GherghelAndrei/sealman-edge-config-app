import { useState } from "react";
import SimpleDialog from "@/components/Modal/SimpleDialog";
import Button, { ButtonColor, ButtonSize } from "@/components/Input/Button";
import type { FieldDefinition } from "./FieldsEditor";
import type { TypeRecord } from "./TypeFormDialog";

/** Mount it only while it is open: the selection starts from the props on every mount. */
export interface ApplyExtensionFieldsDialogProps {
  extension: string;
  fields: Record<string, FieldDefinition>;
  endpointTypes: TypeRecord[];
  /** Type IDs checked when the dialog opens: every type for "Apply to all types", none for
   * "Choose types". Every field is always checked when it opens. */
  initialTypeIds: string[];
  isPending?: boolean;
  onClose: () => void;
  onSubmit: (selection: { type_ids: string[]; keys: string[] }) => void;
}

function toggle(values: string[], value: string): string[] {
  return values.includes(value) ? values.filter((v) => v !== value) : [...values, value];
}

/** Picks which endpoint types get which of an extension's declared fields. */
export default function ApplyExtensionFieldsDialog({
  extension,
  fields,
  endpointTypes,
  initialTypeIds,
  isPending,
  onClose,
  onSubmit,
}: ApplyExtensionFieldsDialogProps) {
  const [typeIds, setTypeIds] = useState<string[]>(initialTypeIds);
  const [keys, setKeys] = useState<string[]>(() => Object.keys(fields));

  // Send the selection in display order, whatever order it was ticked in.
  const selectedTypeIds = endpointTypes.map((t) => t.type_id).filter((id) => typeIds.includes(id));
  const selectedKeys = Object.keys(fields).filter((key) => keys.includes(key));
  const canApply = selectedTypeIds.length > 0 && selectedKeys.length > 0;

  return (
    <SimpleDialog isOpen title={`Apply fields from "${extension}"`}>
      <div className="space-y-4">
        <fieldset className="space-y-1">
          <legend className="text-sm font-medium mb-1">Endpoint types</legend>
          {endpointTypes.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No endpoint types defined</p>
          ) : (
            endpointTypes.map((type) => (
              <label key={type.type_id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={typeIds.includes(type.type_id)}
                  onChange={() => setTypeIds((prev) => toggle(prev, type.type_id))}
                />
                {type.label}
              </label>
            ))
          )}
        </fieldset>

        <fieldset className="space-y-1">
          <legend className="text-sm font-medium mb-1">Fields</legend>
          {Object.entries(fields).map(([key, definition]) => (
            <label key={key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={keys.includes(key)}
                onChange={() => setKeys((prev) => toggle(prev, key))}
              />
              {`${definition.label} (${key})`}
            </label>
          ))}
        </fieldset>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            size={ButtonSize.Small}
            onClick={() => onSubmit({ type_ids: selectedTypeIds, keys: selectedKeys })}
            processing={isPending}
            disabled={!canApply}
          >
            Apply
          </Button>
          <Button size={ButtonSize.Small} color={ButtonColor.Gray} onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
        </div>
      </div>
    </SimpleDialog>
  );
}
