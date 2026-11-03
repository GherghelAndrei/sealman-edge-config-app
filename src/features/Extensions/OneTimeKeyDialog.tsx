import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function OneTimeKey({ secret }: { secret: string }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function copy() {
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      setError(null);
    } catch {
      setError("Could not copy the key. Select and copy it manually before closing.");
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-amber-800">Copy this key now. It cannot be retrieved again after closing.</p>
      <code className="block break-all rounded-md border bg-muted/40 p-3 text-xs select-all">{secret}</code>
      <Button type="button" variant="outline" onClick={() => { void copy(); }}>{copied ? "Copied" : "Copy key"}</Button>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

export function OneTimeKeyDialog({ title, secret, onClose }: { title: string; secret: string | null; onClose: () => void }) {
  return (
    <Dialog open={secret !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>This credential authenticates calls to the extension. Keep it secret.</DialogDescription>
        </DialogHeader>
        {secret !== null && <OneTimeKey secret={secret} />}
        <DialogFooter><Button type="button" onClick={onClose}>Done</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
