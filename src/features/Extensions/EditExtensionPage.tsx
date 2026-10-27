import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { ArrowLeft, AlertCircle, Download, FileJson } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetExtension, useReplaceExtension } from "@/generated/edge-administration/hooks/useExtensions";
import { ApplyManifestDialog } from "./ApplyManifestDialog";
import { ExtensionFormFields } from "./ExtensionFormFields";
import { extensionErrorMessages } from "./extensionErrors";
import { draftFromRegistration, draftToRegistration, emptyDraft, type ExtensionFormDraft } from "./extensionFormTypes";
import { downloadDraftAsManifest } from "./exportManifest";

export default function EditExtensionPage() {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const { data: extension, isLoading, isError } = useGetExtension(name ?? "");
  const replaceExtension = useReplaceExtension();

  const [draft, setDraft] = useState<ExtensionFormDraft>(emptyDraft());
  const [errors, setErrors] = useState<string[]>([]);
  const [importOpen, setImportOpen] = useState(false);

  useEffect(() => {
    if (extension) setDraft(draftFromRegistration(extension));
  }, [extension]);

  const backButton = (
    <Button variant="outline" size="sm" className="h-7 px-2 bg-card" onClick={() => navigate("..")}>
      <ArrowLeft className="h-4 w-4 mr-1" />
      {name}
    </Button>
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        {backButton}
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !extension) {
    return (
      <div className="space-y-4">
        {backButton}
        <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground py-12">
          <AlertCircle className="h-8 w-8 text-destructive opacity-60" />
          <p className="text-sm">Failed to load extension.</p>
        </div>
      </div>
    );
  }

  async function handleSubmit() {
    if (!name) return;
    let result;
    try {
      result = draftToRegistration(draft);
    } catch {
      setErrors(["Something went wrong reading this form - please check every section for unexpected values."]);
      return;
    }
    if (!result.registration) {
      setErrors(result.errors);
      return;
    }
    setErrors([]);
    try {
      await replaceExtension.mutateAsync({ params: { path: { name } }, body: result.registration });
      toast.success(`Extension "${name}" updated`);
      navigate("..");
    } catch (e) {
      const messages = extensionErrorMessages(e, "Failed to update extension");
      setErrors(messages);
      toast.error(messages[0]);
    }
  }

  return (
    <div className="space-y-6">
      {backButton}

      <div>
        <h1 className="text-xl font-semibold">Edit extension - {extension.name}</h1>
        <div className="mt-1 flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            Update the extension's upstreams, actions, granted roles, and routes.
          </p>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-muted-foreground gap-1"
              onClick={() => {
                const result = downloadDraftAsManifest(draft);
                setErrors(result.errors);
              }}
            >
              <Download className="h-4 w-4" />
              Download as file
            </Button>
            <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-muted-foreground gap-1" onClick={() => setImportOpen(true)}>
              <FileJson className="h-4 w-4" />
              Apply from file
            </Button>
          </div>
        </div>
      </div>

      <ApplyManifestDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        lockedName={extension.name}
        onApply={(next) => {
          setDraft(next);
          setErrors([]);
          toast.info("Form updated from registration file - review and save when ready");
        }}
      />

      <Card>
        <CardContent className="pt-6">
          <ExtensionFormFields draft={draft} onChange={setDraft} nameLocked />
        </CardContent>

        {errors.length > 0 && (
          <div className="mx-6 mb-6 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive space-y-1">
            {errors.map((e, i) => <p key={i}>{e}</p>)}
          </div>
        )}

        <CardFooter className="justify-end gap-2 border-t pt-6">
          <Button type="button" onClick={handleSubmit} disabled={replaceExtension.isPending}>
            {replaceExtension.isPending ? "Saving…" : "Save changes"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
