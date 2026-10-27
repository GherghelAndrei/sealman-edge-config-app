import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { client } from "@/generated/edge-administration/api";
import { latestCheckedAt, rollupHealth, type RollupHealth, type UpstreamHealthStatus } from "./types";

// Belt-and-braces on top of the auth middleware's own token-acquisition timeout: bounds
// the actual network fetch too, so a stalled connection can't leave the dot spinning forever.
const HEALTH_CHECK_REQUEST_TIMEOUT_MS = 15000;

export interface ExtensionHealthState {
  /** undefined only when we have neither a persisted last_status nor a live result yet. */
  rollup?: RollupHealth;
  upstreams?: Record<string, UpstreamHealthStatus>;
  /** Newest `last_checked_at` among the upstreams currently driving `rollup`. */
  lastCheckedAt?: string;
  isChecking: boolean;
  /** `Date.now()` timestamp of when the in-flight check was fired; undefined when not
   * checking, or when a persisted status is already on screen (no spinner). */
  checkStartedAt?: number;
  /** Set when the health-check request itself failed (network/auth/timeout) - distinct
   * from an upstream reporting "unhealthy", which is a successful check with bad news. */
  error?: string;
  recheck: () => void;
}

/** Live-refreshes `POST /extensions/{name}/health-check` once the row/page is shown, but
 * immediately surfaces whatever `last_status` GET /extensions already persisted. A plain
 * GET never triggers a check on its own (see extensions/setup.py) - this hook is that
 * ask - but it must not blank out a known-healthy registration while the POST is in
 * flight (or if the POST observer never settles).
 *
 * Skipped entirely while `enabled` is false: a disabled extension's routes aren't
 * mounted, so probing its upstream doesn't tell you anything actionable. */
export function useExtensionHealth(
  name: string,
  enabled: boolean = true,
  persistedUpstreams?: Record<string, UpstreamHealthStatus>,
): ExtensionHealthState {
  const query = useQuery({
    queryKey: ["extension-health", name],
    enabled: enabled && Boolean(name),
    staleTime: 10_000,
    retry: false,
    queryFn: async ({ signal }) => {
      const timeout = AbortSignal.timeout(HEALTH_CHECK_REQUEST_TIMEOUT_MS);
      const combined = typeof AbortSignal.any === "function" ? AbortSignal.any([signal, timeout]) : timeout;
      const { data, error } = await client.POST("/extensions/{name}/health-check", {
        params: { path: { name } },
        signal: combined,
      });
      if (error) {
        throw error instanceof Error ? error : new Error("Health check request failed");
      }
      if (!data?.upstreams) {
        throw new Error("Empty health check response");
      }
      return data.upstreams;
    },
  });

  const [checkStartedAt, setCheckStartedAt] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (query.isFetching && !query.data && !persistedUpstreams) {
      setCheckStartedAt((prev) => prev ?? Date.now());
    } else {
      setCheckStartedAt(undefined);
    }
  }, [query.isFetching, query.data, persistedUpstreams]);

  const upstreams = query.data ?? persistedUpstreams;
  const errorMessage =
    query.error instanceof Error
      ? query.error.message
      : query.error
        ? "Health check request failed"
        : undefined;

  return {
    rollup: upstreams ? rollupHealth(upstreams) : undefined,
    upstreams,
    lastCheckedAt: latestCheckedAt(upstreams),
    isChecking: query.isFetching,
    checkStartedAt,
    error: query.isError && !upstreams ? errorMessage : undefined,
    recheck: () => {
      void query.refetch();
    },
  };
}
