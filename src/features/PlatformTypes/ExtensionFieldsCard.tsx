import { useState } from "react";
import { toast } from "react-toastify";
import { ApiError } from "@/generated/edge-administration/api";
import type { ExtensionFieldSet } from "@/generated/edge-administration/hooks/extension_fields/useGetExtensionFields";
import type {
  ApplyExtensionFieldsRequest,
  ApplyExtensionFieldsResponse,
} from "@/generated/edge-administration/hooks/extension_fields/useApplyExtensionFields";
import ApplyExtensionFieldsDialog from "./ApplyExtensionFieldsDialog";
import type { TypeRecord } from "./TypeFormDialog";

export interface ExtensionFieldsCardProps {
  fieldSet: ExtensionFieldSet;
  endpointTypes: TypeRecord[];
  onApply: (extension: string, body: ApplyExtensionFieldsRequest) => Promise<ApplyExtensionFieldsResponse>;
}

const actionButtonClass = `inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium
  bg-primary/10 text-primary border border-primary/20
  hover:bg-primary hover:text-white hover:border-primary
  transition-all shadow-sm shrink-0`;

/**
 * "Additional fields" card for one extension: lists the endpoint fields its manifest declares,
 * the endpoint types each one is applied to, and lets the admin apply them to types.
 */
export default function ExtensionFieldsCard({ fieldSet, endpointTypes, onApply }: ExtensionFieldsCardProps) {
  const [dialogTypeIds, setDialogTypeIds] = useState<string[] | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  const sortedTypes = [...endpointTypes].sort((a, b) => a.label.localeCompare(b.label));
  const typeLabel = (typeId: string) => endpointTypes.find((t) => t.type_id === typeId)?.label ?? typeId;
  const fields = Object.entries(fieldSet.fields);

  const handleApply = async (body: ApplyExtensionFieldsRequest) => {
    setIsApplying(true);
    try {
      const result = await onApply(fieldSet.extension, body);
      toast.success(`Applied ${result.applied.length} field(s)`);
      if (result.skipped.length > 0) {
        const items = result.skipped.map((s) => `${typeLabel(s.type_id)}: ${s.key} (key already exists)`);
        toast.warning(`Skipped ${result.skipped.length}: ${items.join(", ")}`);
      }
      setDialogTypeIds(null);
    } catch (e) {
      const message = e instanceof ApiError ? e.message : null;
      toast.error(message ?? `Failed to apply fields from "${fieldSet.extension}"`);
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="bg-card border rounded-lg p-4 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">Additional fields</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Endpoint fields declared by the extension <span className="font-mono">{fieldSet.extension}</span>.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className={actionButtonClass}
            onClick={() => setDialogTypeIds(sortedTypes.map((t) => t.type_id))}
          >
            Apply to all types
          </button>
          <button type="button" className={actionButtonClass} onClick={() => setDialogTypeIds([])}>
            Choose types
          </button>
        </div>
      </div>

      <div className="border rounded-md overflow-hidden">
        <table className="w-full text-sm border-separate border-spacing-0">
          <thead>
            <tr className="bg-gradient-to-r from-slate-100 to-slate-50">
              <th className="px-4 py-3 text-left font-semibold text-muted-foreground border-b">Label</th>
              <th className="px-4 py-3 text-left font-semibold text-muted-foreground border-b">Key</th>
              <th className="px-4 py-3 text-left font-semibold text-muted-foreground border-b">Data type</th>
              <th className="px-4 py-3 text-left font-semibold text-muted-foreground border-b">Applied to</th>
            </tr>
          </thead>
          <tbody>
            {fields.map(([key, definition]) => {
              const appliedTo = fieldSet.applied[key] ?? [];
              return (
                <tr key={key} className="bg-background border-b last:border-b-0">
                  <td className="px-4 py-3 font-medium">{definition.label}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{key}</td>
                  <td className="px-4 py-3">{definition.type}</td>
                  <td className="px-4 py-3">
                    {appliedTo.length === 0 ? (
                      <span className="text-muted-foreground italic">not applied yet</span>
                    ) : (
                      appliedTo.map(typeLabel).join(", ")
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {dialogTypeIds !== null && (
        <ApplyExtensionFieldsDialog
          extension={fieldSet.extension}
          fields={fieldSet.fields}
          endpointTypes={sortedTypes}
          initialTypeIds={dialogTypeIds}
          isPending={isApplying}
          onClose={() => setDialogTypeIds(null)}
          onSubmit={handleApply}
        />
      )}
    </div>
  );
}
