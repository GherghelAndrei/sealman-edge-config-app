import { useRef, useState } from "react";
import { toast } from "react-toastify";
import { UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { draftFromRegistration, type ExtensionFormDraft } from "./extensionFormTypes";
import type { ExtensionRegistration } from "./types";

interface ApplyManifestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Locked name of the extension being edited - kept even if the file says otherwise. */
  lockedName: string;
  onApply: (draft: ExtensionFormDraft) => void;
}

export function ApplyManifestDialog({ open, onOpenChange, lockedName, onApply }: ApplyManifestDialogProps) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setText("");
    setError(null);
  }

  function readFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      setText(String(reader.result ?? ""));
      setError(null);
    };
    reader.readAsText(file);
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  function handleApply() {
    if (!text.trim()) {
      setError("Paste or drop a registration JSON file first.");
      return;
    }
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      setError("That's not valid JSON.");
      return;
    }
    if (!json || typeof json !== "object" || Array.isArray(json)) {
      setError("The file must be a registration object, not an array or primitive.");
      return;
    }
    const parsed = json as ExtensionRegistration;
    let next: ExtensionFormDraft;
    try {
      next = draftFromRegistration(parsed);
    } catch {
      setError("Couldn't read this as an extension registration.");
      return;
    }
    const fileName = (parsed.name ?? "").trim();
    if (fileName && fileName !== lockedName) {
      toast.info(`File name "${fileName}" ignored - this extension stays "${lockedName}"`);
    }
    onApply({ ...next, name: lockedName });
    handleOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Apply registration file</DialogTitle>
          <DialogDescription>
            Drop or paste a manifest JSON. Confirming replaces every field on the form below
            (the extension name stays <span className="font-mono">{lockedName}</span>). Nothing is saved until you click Save changes.
          </DialogDescription>
        </DialogHeader>

        <div
          className="rounded-md border border-dashed p-4 flex flex-col items-center gap-2 text-center cursor-pointer hover:bg-muted/40 transition-colors"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files?.[0];
            if (file) readFile(file);
          }}
        >
          <UploadCloud className="h-6 w-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Click to browse or drop a .json manifest file here</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) readFile(file);
              e.target.value = "";
            }}
          />
        </div>

        <Textarea
          rows={10}
          className="font-mono text-xs"
          placeholder='{ "schema_version": 1, "name": "my-extension", ... }'
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setError(null);
          }}
        />

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleApply} disabled={!text.trim()}>
            Apply to form
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
