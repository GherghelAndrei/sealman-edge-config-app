import { ShieldCheck, Link2, ShieldAlert, ShieldOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { ValidationMode } from "./types";

// Anything other than `declared` is a warning, not an extra permission gate.
// `unreachable_ref` is a persisted fetch status, not a value an author sets in the
// registration file. POST/PUT try the fetch once. Disable and enable again (or
// restart the API) runs the same refetch. There is no separate refetch endpoint.
const MODE_META: Record<
  ValidationMode,
  { label: string; icon: React.ComponentType<{ className?: string }>; tooltip: string; warn: boolean }
> = {
  declared: {
    label: "Declared",
    icon: ShieldCheck,
    warn: false,
    tooltip: "The platform validates every request body against this route's declared JSON Schema before forwarding it.",
  },
  upstream_declared: {
    label: "Upstream declared",
    icon: Link2,
    warn: true,
    tooltip:
      "Warning: the platform does not validate this body. The schema was fetched from the extension's own OpenAPI docs for display only. The extension service must validate the request.",
  },
  unreachable_ref: {
    label: "Unreachable ref",
    icon: ShieldAlert,
    warn: true,
    tooltip:
      "Warning: the platform does not validate this body. This is a temporary status, not something you put in the registration file - the last fetch of the upstream OpenAPI schema failed. Disable and enable the extension again (or restart the API) to refetch. There is no separate refetch action.",
  },
  none: {
    label: "Not validated",
    icon: ShieldOff,
    warn: true,
    tooltip:
      "Warning: no body validation is configured. The platform forwards the body as-is. The extension service is fully responsible for it.",
  },
};

export interface ValidationModeBadgeProps {
  mode?: ValidationMode | null;
}

export function ValidationModeBadge({ mode }: ValidationModeBadgeProps) {
  const meta = MODE_META[mode ?? "none"];
  const Icon = meta.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={
              meta.warn
                ? "gap-1 border-amber-300 bg-amber-50 text-amber-800 font-normal cursor-default"
                : "gap-1 border-gray-300 bg-gray-100 text-gray-600 font-normal cursor-default"
            }
          >
            <Icon className="h-3 w-3" />
            {meta.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          {meta.tooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
