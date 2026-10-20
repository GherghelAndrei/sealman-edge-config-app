import { useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import type { TypeRecord } from "./TypeFormDialog";

export interface ChooseTypesDialogProps {
  extension: string;
  fieldCount: number;
  endpointTypes: TypeRecord[];
  /** Types that already have every one of the extension's fields; listed but not selectable. */
  fullyAppliedTypeIds: Set<string>;
  isPending?: boolean;
  onClose: () => void;
  /** Called on Apply; the parent closes the dialog on success, so it stays open on an error. */
  onSubmit: (typeIds: string[]) => void;
}

/** Picks the endpoint types that get all of an extension's fields. Mount it only while open. */
export default function ChooseTypesDialog({
  extension,
  fieldCount,
  endpointTypes,
  fullyAppliedTypeIds,
  isPending,
  onClose,
  onSubmit,
}: ChooseTypesDialogProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toggle = (typeId: string) =>
    setSelectedIds((prev) => (prev.includes(typeId) ? prev.filter((id) => id !== typeId) : [...prev, typeId]));
  // Show and send the selection in display order, whatever order it was picked in.
  const selectedTypes = endpointTypes.filter((t) => selectedIds.includes(t.type_id));

  return (
    <Dialog open onOpenChange={(open) => !open && !isPending && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{`Apply "${extension}" to endpoint types`}</DialogTitle>
          <DialogDescription>
            {`${fieldCount === 1 ? "The 1 field" : `All ${fieldCount} fields`} of ${extension} ${fieldCount === 1 ? "is" : "are"} added.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox"
                aria-expanded={pickerOpen}
                className="w-full justify-between"
                disabled={isPending}
              >
                Select endpoint types...
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-[var(--radix-popover-trigger-width)] p-0"
              align="start"
              onWheel={(e) => e.stopPropagation()}
            >
              <Command>
                <CommandInput placeholder="Search types..." />
                <CommandList onWheel={(e) => e.stopPropagation()}>
                  <CommandEmpty>No types found</CommandEmpty>
                  {endpointTypes.map((type) => {
                    const applied = fullyAppliedTypeIds.has(type.type_id);
                    const selected = selectedIds.includes(type.type_id);
                    return (
                      <CommandItem
                        key={type.type_id}
                        value={`${type.label} ${type.type_id}`}
                        disabled={applied}
                        onSelect={() => toggle(type.type_id)}
                      >
                        <Check className={cn("h-4 w-4", selected ? "opacity-100" : "opacity-0")} />
                        <span className="flex-1">{type.label}</span>
                        {applied && <span className="text-xs text-muted-foreground italic">already applied</span>}
                      </CommandItem>
                    );
                  })}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {selectedTypes.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedTypes.map((type) => (
                <Badge key={type.type_id} variant="secondary" className="gap-1 pr-1">
                  {type.label}
                  <button
                    type="button"
                    aria-label={`Remove ${type.label}`}
                    className="rounded-sm p-0.5 hover:bg-muted-foreground/20"
                    onClick={() => toggle(type.type_id)}
                    disabled={isPending}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => onSubmit(selectedTypes.map((t) => t.type_id))}
            disabled={isPending || selectedTypes.length === 0}
          >
            {isPending ? "Applying..." : "Apply"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
