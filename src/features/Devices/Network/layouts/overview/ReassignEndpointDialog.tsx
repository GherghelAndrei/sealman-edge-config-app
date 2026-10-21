import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { inputClass, validateFields } from "@/features/PlatformTypes/FieldValueInput";
import useGetEndpointTypes from "@/generated/edge-administration/hooks/endpoint_types/useGetEndpointTypes";
import { useUpdateEndpoint } from "@/generated/edge-administration/hooks/endpoints/useUpdateEndpoint";
import { components } from "@/generated/edge-administration/types";
import TypeFieldsForm from "./TypeFieldsForm";
import { initialRetypeValues, nonEmptyValues } from "./retypeData";

type ResolvedField = components["schemas"]["ResolvedField"];

interface props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  endpointId: string;
  currentTypeId: string;
  /** The endpoint's stored data - matching keys pre-fill the new type's fields. */
  currentData: Record<string, ResolvedField>;
  onReassigned: () => void;
}

export default function ReassignEndpointDialog({
  open,
  onOpenChange,
  endpointId,
  currentTypeId,
  currentData,
  onReassigned,
}: props) {
  const { data: endpointTypes } = useGetEndpointTypes();
  const { updateEndpoint, isPending } = useUpdateEndpoint();

  const [typeId, setTypeId] = useState("");
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [error, setError] = useState<string | null>(null);

  const selectedType = (endpointTypes ?? []).find((t) => t.type_id === typeId);

  useEffect(() => {
    if (!open) return;
    setTypeId(currentTypeId);
    setError(null);
  }, [open, currentTypeId]);

  useEffect(() => {
    if (!selectedType) {
      setValues({});
      return;
    }
    // Retyping keeps all stored data (the API merges the patch onto it). Matching keys start with
    // their stored value; everything else stays on the endpoint as Custom Fields.
    setValues(initialRetypeValues(selectedType.fields, currentData));
  }, [selectedType, currentData]);

  const handleSubmit = async () => {
    if (!selectedType) {
      setError("Select an endpoint type");
      return;
    }
    const validationError = validateFields(values, selectedType.fields);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    try {
      await updateEndpoint({ endpointId, body: { type_id: selectedType.type_id, endpoint_data: nonEmptyValues(values) } });
      toast.success(`Endpoint reassigned to "${selectedType.label}"`);
      onReassigned();
      onOpenChange(false);
    } catch {
      setError("Failed to reassign endpoint");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Reassign Endpoint</DialogTitle>
          <DialogDescription>
            Change the type of this endpoint. Existing values are kept: values for the new type's fields
            are pre-filled, everything else stays as Custom Fields.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Endpoint Type *</label>
            <select value={typeId} onChange={(e) => setTypeId(e.target.value)} className={inputClass}>
              <option value="">Select a type...</option>
              {(endpointTypes ?? []).map((t) => (
                <option key={t.type_id} value={t.type_id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {selectedType && (
            <TypeFieldsForm
              fields={selectedType.fields}
              values={values}
              onChange={(key, value) => setValues((v) => ({ ...v, [key]: value }))}
              lockSavedValues={false}
            />
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending || !selectedType || selectedType.type_id === currentTypeId}>
            {isPending ? "Reassigning..." : "Reassign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
