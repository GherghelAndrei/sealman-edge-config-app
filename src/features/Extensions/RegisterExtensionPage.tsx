import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { ArrowLeft, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useRegisterExtension } from "@/generated/edge-administration/hooks/useExtensions";
import { ExtensionFormFields } from "./ExtensionFormFields";
import { extensionErrorMessages } from "./extensionErrors";
import { draftFromRegistration, draftToRegistration, emptyDraft, type ExtensionFormDraft } from "./extensionFormTypes";
import type { ExtensionRegistration } from "./types";

interface JsonImportStepProps {
  /** null means "no manifest to apply" (skip, or continue with an empty textarea). */
  onContinue: (json: unknown | null) => void;
}

function JsonImportStep({ onContinue }: JsonImportStepProps) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function readFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => setText(String(reader.result ?? ""));
    reader.readAsText(file);
  }

  function handleContinue() {
    if (!text.trim()) {
      onContinue(null);
      return;
    }
    try {
      const json = JSON.parse(text);
      setError(null);
      onContinue(json);
    } catch {
      setError("That's not valid JSON - fix it, clear it, or skip this step.");
    }
  }

  return (
    <Card>
      <CardContent className="space-y-3 pt-6">
        <p className="text-sm text-muted-foreground">
          Optionally paste or drop a registration manifest JSON file to prefill every field on the next step. This
          step is entirely optional - skip it to start from a blank form.
        </p>
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
          rows={8}
          className="font-mono text-xs"
          placeholder='{ "schema_version": 1, "name": "my-extension", ... }'
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
      <CardFooter className="justify-end gap-2 border-t pt-6">
        <Button type="button" variant="outline" onClick={() => onContinue(null)}>Skip, start blank</Button>
        <Button type="button" onClick={handleContinue}>Continue</Button>
      </CardFooter>
    </Card>
  );
}

export default function RegisterExtensionPage() {
  const navigate = useNavigate();
  const registerExtension = useRegisterExtension();
  const [step, setStep] = useState<"import" | "form">("import");
  const [draft, setDraft] = useState<ExtensionFormDraft>(emptyDraft());
  const [errors, setErrors] = useState<string[]>([]);

  function handleImportContinue(json: unknown | null) {
    if (json !== null) {
      try {
        setDraft(draftFromRegistration(json as ExtensionRegistration));
      } catch {
        setDraft(emptyDraft());
      }
    }
    setErrors([]);
    setStep("form");
  }

  async function handleSubmit() {
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
      await registerExtension.mutateAsync({ body: result.registration });
      toast.success(`Extension "${result.registration.name}" registered`);
      navigate("..");
    } catch (e) {
      const messages = extensionErrorMessages(e, "Failed to register extension");
      setErrors(messages);
      toast.error(messages[0]);
    }
  }

  return (
    <div className="space-y-6">
      <Button variant="outline" size="sm" className="h-7 px-2 bg-card" onClick={() => navigate("..")}>
        <ArrowLeft className="h-4 w-4 mr-1" />
        Extensions
      </Button>

      <div>
        <h1 className="text-xl font-semibold">Register extension</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {step === "import"
            ? "Import an existing manifest, or start from a blank form."
            : "Define the extension's upstreams, actions, granted roles, and routes."}
        </p>
      </div>

      {step === "import" ? (
        <JsonImportStep onContinue={handleImportContinue} />
      ) : (
        <Card>
          <CardContent className="pt-6">
            <ExtensionFormFields draft={draft} onChange={setDraft} />
          </CardContent>

          {errors.length > 0 && (
            <div className="mx-6 mb-6 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive space-y-1">
              {errors.map((e, i) => <p key={i}>{e}</p>)}
            </div>
          )}

          <CardFooter className="justify-end gap-2 border-t pt-6">
            <Button type="button" variant="outline" onClick={() => setStep("import")}>Back to import</Button>
            <Button type="button" onClick={handleSubmit} disabled={registerExtension.isPending}>
              {registerExtension.isPending ? "Registering…" : "Register"}
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
