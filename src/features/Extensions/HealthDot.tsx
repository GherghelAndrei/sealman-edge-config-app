import { useEffect, useState } from "react";
import { formatDistanceToNowStrict } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { RollupHealth } from "./types";

const STATUS_COLOR: Record<RollupHealth, string> = {
  healthy: "bg-green-500",
  unhealthy: "bg-red-500",
  unknown: "bg-gray-400",
};

const STATUS_LABEL: Record<RollupHealth, string> = {
  healthy: "Healthy",
  unhealthy: "Unhealthy",
  unknown: "Unknown - no successful health check yet",
};

/** Ticks once a second for as long as `startedAt` is set, so a tooltip can show "checking
 * for Xs" instead of leaving a bare spinner with no sense of progress or elapsed time. */
function useElapsedSeconds(startedAt: number | undefined): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!startedAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  return startedAt ? Math.max(0, Math.round((now - startedAt) / 1000)) : 0;
}

export function formatCheckedAt(iso: string | null | undefined): string | undefined {
  if (!iso) return undefined;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return undefined;
  if (Date.now() - date.getTime() < 60_000) return "just now";
  return formatDistanceToNowStrict(date, { addSuffix: true });
}

export interface HealthDotProps {
  /** undefined while the health-check request for this extension is still in flight. */
  status?: RollupHealth;
  detail?: string | null;
  /** ISO timestamp of the last persisted or live health probe. */
  lastCheckedAt?: string | null;
  className?: string;
  /** Extension is disabled, so no check ever ran (or will run) for it - shows a neutral
   * dot instead of an endless "still loading" skeleton. */
  disabled?: boolean;
  /** Timestamp the in-flight check was fired at; drives the "checking for Xs" tooltip. */
  checkStartedAt?: number;
  /** The health-check *request* itself failed (network/auth/timeout) - distinct from a
   * successful check that reports "unhealthy". */
  error?: string;
}

export function HealthDot({ status, detail, lastCheckedAt, className, disabled, checkStartedAt, error }: HealthDotProps) {
  const elapsedSeconds = useElapsedSeconds(status === undefined && !disabled ? checkStartedAt : undefined);
  const checkedLabel = formatCheckedAt(lastCheckedAt);

  if (disabled) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={cn("inline-block h-2.5 w-2.5 rounded-full shrink-0 bg-gray-300", className)} />
          </TooltipTrigger>
          <TooltipContent side="top">Extension disabled - health isn't checked</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (!status && error) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={cn("inline-block h-2.5 w-2.5 rounded-full shrink-0 bg-amber-500", className)} />
          </TooltipTrigger>
          <TooltipContent side="top">Health check failed: {error}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (!status) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Skeleton className={cn("h-2.5 w-2.5 rounded-full", className)} />
          </TooltipTrigger>
          <TooltipContent side="top">
            {checkStartedAt ? `Checking health… ${elapsedSeconds}s` : "Waiting to check health…"}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn("inline-block h-2.5 w-2.5 rounded-full shrink-0", STATUS_COLOR[status], className)}
          />
        </TooltipTrigger>
        <TooltipContent side="top">
          {STATUS_LABEL[status]}
          {detail ? `: ${detail}` : ""}
          {checkedLabel ? ` · checked ${checkedLabel}` : ""}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
