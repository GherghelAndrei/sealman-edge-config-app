import { Accordion } from "@/components/ui/accordion";
import type { ExtensionFieldSet } from "@/generated/edge-administration/hooks/extension_fields/useGetExtensionFields";
import ExtensionFieldsRow, { type ExtensionFieldsRowProps } from "./ExtensionFieldsRow";
import type { TypeRecord } from "./TypeFormDialog";

export interface ExtensionFieldsCardProps {
  fieldSets: ExtensionFieldSet[];
  endpointTypes: TypeRecord[];
  onApply: ExtensionFieldsRowProps["onApply"];
}

/**
 * The single "Additional fields" card: one collapsible row per extension (all collapsed at first),
 * each listing the endpoint fields its manifest declares and letting the admin apply them to types.
 */
export default function ExtensionFieldsCard({ fieldSets, endpointTypes, onApply }: ExtensionFieldsCardProps) {
  return (
    <div className="bg-card border rounded-lg p-4 space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Additional fields</h3>
        <p className="text-sm text-muted-foreground mt-1">Fields that extensions add to endpoint types.</p>
      </div>

      <Accordion type="multiple" className="border rounded-md">
        {fieldSets.map((fieldSet) => (
          <ExtensionFieldsRow
            key={fieldSet.extension}
            fieldSet={fieldSet}
            endpointTypes={endpointTypes}
            onApply={onApply}
          />
        ))}
      </Accordion>
    </div>
  );
}
