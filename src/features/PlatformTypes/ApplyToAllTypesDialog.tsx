import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { TypeRecord } from "./TypeFormDialog";

export interface ApplyToAllTypesDialogProps {
  extension: string;
  fieldCount: number;
  endpointTypes: TypeRecord[];
  isPending?: boolean;
  onClose: () => void;
  /** Called on Apply; the parent closes the dialog on success, so it stays open on an error. */
  onConfirm: () => void;
}

/** Confirms applying all of an extension's fields to every endpoint type. Mount it only while open. */
export default function ApplyToAllTypesDialog({
  extension,
  fieldCount,
  endpointTypes,
  isPending,
  onClose,
  onConfirm,
}: ApplyToAllTypesDialogProps) {
  const labels = endpointTypes.map((t) => t.label).join(", ");

  return (
    <AlertDialog open onOpenChange={(open) => !open && !isPending && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{`Apply "${extension}" to all endpoint types?`}</AlertDialogTitle>
          <AlertDialogDescription>
            {`${fieldCount === 1 ? "The 1 field is" : `All ${fieldCount} fields are`} added to ${labels}. Types that already have a field with the same key keep their own.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            onClick={(e) => {
              // Keep the dialog open until the request succeeds.
              e.preventDefault();
              onConfirm();
            }}
          >
            {isPending ? "Applying..." : "Apply"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
