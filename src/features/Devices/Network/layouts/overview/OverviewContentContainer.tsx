import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";
import { Centered } from "@/features/Devices/Network/components";
import { useNetworkPageStore } from "@/features/Devices/Network/stores";
import usePostDeviceNetworkDiscover, { ScanResult } from "@/generated/edge-administration/hooks/network/usePostDeviceNetworkDiscover";
import usePostNetworkOverview, { NetworkOverview } from "@/generated/edge-administration/hooks/network/usePostNetworkOverview";
import useGetNetworkScanPorts from "@/generated/edge-administration/hooks/network/useGetNetworkScanPorts";
import useGetNetworkScanRange from "@/generated/edge-administration/hooks/network/useGetNetworkScanRange";
import usePostDeviceScanPorts from "@/generated/edge-administration/hooks/network/usePostDeviceScanPorts";
import { client } from "@/generated/edge-administration/api";
import DiscoveredEndpointsCard from "./DiscoveredEndpointsCard";
import UnidentifiedEndpointsCard from "./UnidentifiedEndpointsCard";
import ScanNetworkDialog, { ScanNetworkRange } from "./ScanNetworkDialog";
import AssignEndpointDialog from "./AssignEndpointDialog";
import EndpointDetailsPage from "./EndpointDetailsPage";
import ServiceDetailsPage from "./ServiceDetailsPage";
import { mergeConfiguredEndpoints, mergeEndpointsByIp } from "./overviewMerge";

const BACKGROUND_REFRESH_INTERVAL_MS = 3000;

function mergeScanResults(primary: ScanResult[], additions: ScanResult[][]): ScanResult[] {
  const byIp = new Map<string, ScanResult>();
  for (const result of primary) byIp.set(result.ip, result);
  for (const group of additions) {
    for (const result of group) {
      if (!byIp.has(result.ip)) byIp.set(result.ip, result);
    }
  }
  return [...byIp.values()];
}

function ipToInt(ip: string): number {
  return ip.split(".").reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0;
}

function isIpInRange(ip: string, range: ScanNetworkRange): boolean {
  const maskInt = range.subnetMask === 0 ? 0 : (0xffffffff << (32 - range.subnetMask)) >>> 0;
  return (ipToInt(ip) & maskInt) === (ipToInt(range.networkDefinition) & maskInt);
}

// Individual IPs that a range scan already covers shouldn't also get their own separate discover
// call - that's a pure duplicate (same host, same ports, two round trips) rather than genuinely
// new information.
function excludeIpsCoveredByRanges(ips: string[], ranges: ScanNetworkRange[]): string[] {
  if (ranges.length === 0) return ips;
  return ips.filter((ip) => !ranges.some((range) => isIpInRange(ip, range)));
}

// The live scan needs the device itself to be reachable (it's a direct method call through IoT
// Hub) - if it's offline, `discover`/`overview` simply can't succeed, no matter how many times we
// retry. But what's actually *configured* for this device (endpoints/services already saved to
// the database) is a plain backend read, independent of the device's own connectivity - so it's
// still available and worth showing, at its last known persisted status/timestamp (from
// `device_host_status`/`device_port_status`), rather than everything going blank. Note this is
// exactly that - the *last known* state, not necessarily the current one - it can lag behind
// reality whenever the live scan can't run at all (e.g. the device has been unreachable via IoT
// Hub for a while), since nothing updates these persisted statuses without a live scan.
async function buildOfflineFallbackOverview(deviceId: string): Promise<NetworkOverview> {
  const { data } = await client.GET("/{device}/network/last-known", { params: { path: { device: deviceId } } });
  return data ?? { scanDefinition: { networkDefinition: "0.0.0.0", subnetMask: 32, ports: [] }, endpoints: [] };
}

export default function OverviewContentContainer() {
  const deviceId = useNetworkPageStore((s) => s.deviceId);

  const { data: catalogPorts, isLoading: isLoadingPorts, isError: isPortsError, refetch: refetchPorts } = useGetNetworkScanPorts(deviceId);
  // The baseline scan range is derived server-side from this device's own configured endpoints'
  // IPs - see get_network_scan_range.py. `networkDefinition`/`subnetMask` are null when there's
  // no per-device evidence yet, but `suggestedIps` (endpoint types' default IPs, probed
  // individually, never persisted) can still be non-empty in that case. The whole response is
  // `undefined` only when there's truly nothing at all - no evidence and no type has a default.
  const { data: scanRange, isLoading: isLoadingRange, isError: isRangeError, refetch: refetchRange } = useGetNetworkScanRange(deviceId);
  const { mutateAsync: discoverAsync } = usePostDeviceNetworkDiscover();
  const { mutateAsync: overviewAsync } = usePostNetworkOverview();
  const { mutateAsync: addDeviceScanPortsAsync } = usePostDeviceScanPorts();

  // Sticky results from the one-time custom scan (Scan Network dialog) - kept around and merged
  // into what's shown for as long as this page stays open, even though the recurring baseline
  // scan below never re-scans that custom range/IPs itself (see `extraScanQuery`).
  const [scanDialogOpen, setScanDialogOpen] = useState(false);
  const [addEndpointOpen, setAddEndpointOpen] = useState(false);
  const [extraPorts, setExtraPorts] = useState<number[]>([]);
  const [extraIps, setExtraIps] = useState<string[]>([]);
  // The most recently confirmed custom range from the Scan Network dialog (e.g. via its "Read
  // Network Configuration" button) - not persisted server-side; only used to fire the one-time
  // scan below, and never re-scanned by the recurring baseline poll itself.
  const [extraRange, setExtraRange] = useState<ScanNetworkRange | null>(null);
  // The dialog's "Network range for this scan" text inputs, lifted up here (rather than kept
  // local to the dialog) so a "Read Network Configuration" result survives closing and
  // reopening the dialog - see ScanNetworkDialog's `open`-keyed reset effect.
  const [rangeNetworkInput, setRangeNetworkInput] = useState("");
  const [rangeMaskInput, setRangeMaskInput] = useState("");
  const [detailsEndpointId, setDetailsEndpointId] = useState<string | null>(null);
  const [detailsServiceId, setDetailsServiceId] = useState<string | null>(null);

  // Prefill the Scan Network dialog's range inputs with the persisted baseline range once it's
  // loaded, so a page refresh doesn't leave them blank - but only the first time it becomes
  // available, so this doesn't clobber whatever the user has since typed or read from the device.
  // Set during render (React's supported pattern for adjusting state from other state) rather
  // than in an effect, since this is a one-shot derivation, not a subscription to an external
  // system.
  const [hasPrefilledRange, setHasPrefilledRange] = useState(false);
  if (!hasPrefilledRange && scanRange?.networkDefinition && scanRange.subnetMask != null) {
    setHasPrefilledRange(true);
    setRangeNetworkInput(scanRange.networkDefinition);
    setRangeMaskInput(String(scanRange.subnetMask));
  }

  async function runDiscoverAndOverview(
    ranges: ScanNetworkRange[],
    ips: string[],
    ports: number[],
  ): Promise<NetworkOverview | null> {
    if (ranges.length === 0 && ips.length === 0) {
      // Nothing known/configured to scan yet - skip the network round-trip entirely and show
      // an empty result set instead of erroring (the user can add a range via Scan Network).
      return overviewAsync({
        deviceId,
        body: { scanResults: [], scanDefinition: { networkDefinition: "0.0.0.0", subnetMask: 32, ports } },
      });
    }

    const rangeScans = await Promise.all(
      ranges.map((r) =>
        discoverAsync({ deviceId, body: { networkDefinition: r.networkDefinition, subnetMask: r.subnetMask, ports } })
      )
    );

    const ipScans = await Promise.all(
      ips.map((ip) => discoverAsync({ deviceId, body: { networkDefinition: ip, subnetMask: 32, ports } }))
    );

    const allScans = [...rangeScans, ...ipScans];
    const primaryScan = allScans.find((s) => s);
    if (!primaryScan) {
      // A scan call resolved without throwing but returned nothing usable - surface this as a
      // real failure (via the caller's error state) rather than silently leaving `overview`
      // unset, which would otherwise get stuck on the loading spinner forever with no way to
      // retry.
      throw new Error("Network scan returned no result");
    }

    const scanResults = mergeScanResults(
      primaryScan.payload.scanResults,
      allScans.filter((s) => s && s !== primaryScan).map((s) => s!.payload.scanResults)
    );

    return overviewAsync({ deviceId, body: { scanResults, scanDefinition: primaryScan.payload.scanDefinition } });
  }

  // The persisted baseline range (only present once there's real per-device evidence for it -
  // see get_network_scan_range.py), plus every endpoint type's default IP as an individual probe
  // (`suggestedIps`) - global suggestions, tried fresh every cycle, never persisted, so "a type
  // has a default IP" alone leads to auto-discovery without needing a configured endpoint or a
  // manual scan first.
  const baselineRanges: ScanNetworkRange[] =
    scanRange?.networkDefinition && scanRange?.subnetMask != null
      ? [{ networkDefinition: scanRange.networkDefinition, subnetMask: scanRange.subnetMask }]
      : [];
  // Drop any suggested IP the baseline range scan already covers - probing it again individually
  // would just be a duplicate discover call for a host we're already scanning.
  const suggestedIps = excludeIpsCoveredByRanges(scanRange?.suggestedIps ?? [], baselineRanges);

  // Primitive, value-based cache keys rather than the raw `catalogPorts`/`scanRange` objects -
  // those come from other queries' `.data`, and even with structural sharing there's no
  // guarantee they stay reference-stable across every refetch. If the queryKey below changed
  // reference on every tick even though nothing meaningfully changed, TanStack Query would treat
  // it as a brand new query each time - discarding the cached `data` and resetting to a fresh
  // "first load" state, which is exactly the "page updates/flickers even when nothing changed"
  // symptom the cache is supposed to prevent. Keying on this instead means the query - and its
  // cached result - only actually changes identity when the scan target itself changes.
  const catalogPortsKey = (catalogPorts ?? []).join(",");
  const scanRangeKey = scanRange
    ? `${scanRange.networkDefinition ?? ""}/${scanRange.subnetMask ?? ""}:${[...(scanRange.suggestedIps ?? [])].sort().join(",")}`
    : "";

  // The recurring baseline scan - driven entirely by TanStack Query's own `refetchInterval`
  // scheduling instead of a hand-rolled setInterval/in-flight-guard: it already de-dupes
  // concurrent fetches for the same query key and only ever has one fetch for this key in
  // flight at a time, which is what previously needed manual refs to enforce.
  const overviewQuery = useQuery({
    queryKey: ["network-overview", deviceId, catalogPortsKey, scanRangeKey],
    queryFn: () => runDiscoverAndOverview(baselineRanges, suggestedIps, catalogPorts ?? []),
    enabled: Boolean(deviceId) && !isLoadingPorts && Boolean(catalogPorts) && !isLoadingRange,
    refetchInterval: BACKGROUND_REFRESH_INTERVAL_MS,
  });
  const overview = overviewQuery.data ?? undefined;

  // What's actually configured for this device (endpoints/services already saved to the
  // database) is a plain backend read, independent of the device's own connectivity - unlike
  // `overviewQuery`, it doesn't need the device to be reachable. It's always kept alongside the
  // live scan and merged in below (as "offline" entries) rather than only shown as a fallback
  // when the live scan errors, since a live scan that's simply empty right now (or hasn't
  // finished its first tick yet) shouldn't make already-configured endpoints disappear either.
  const offlineFallbackQuery = useQuery({
    queryKey: ["network-offline-fallback", deviceId],
    queryFn: () => buildOfflineFallbackOverview(deviceId),
    enabled: Boolean(deviceId),
  });

  // The one-time custom scan (Scan Network dialog) - `enabled` is derived from whether a custom
  // range/IPs are currently set, so setting them (via `handleConfirmScan`) automatically fires
  // this query without a manual `.refetch()` call racing the not-yet-committed state update.
  const extraScanQuery = useQuery({
    queryKey: ["network-extra-scan", deviceId, extraRange, extraPorts, extraIps, catalogPortsKey],
    queryFn: () => {
      const allPorts = [...new Set([...(catalogPorts ?? []), ...extraPorts])];
      const ranges = extraRange ? [extraRange] : [];
      return runDiscoverAndOverview(ranges, excludeIpsCoveredByRanges(extraIps, ranges), allPorts);
    },
    enabled: Boolean(deviceId) && (extraRange !== null || extraIps.length > 0 || extraPorts.length > 0),
  });
  const extraEndpoints = extraScanQuery.data?.endpoints ?? [];

  useEffect(() => {
    if (extraScanQuery.isError) {
      toast.error("Failed to scan the custom network range. Please try again.");
    }
  }, [extraScanQuery.isError]);

  // Only reflects the manual one-time scan (Scan Network dialog), not the recurring background
  // autoscan - the "Scan Network" button shouldn't animate every few seconds just because the
  // baseline poll is refreshing.
  const isScanning = extraScanQuery.isFetching;

  const handleRefresh = () => {
    overviewQuery.refetch();
    offlineFallbackQuery.refetch();
    // Keep the custom scan's results fresh too, so they don't go stale after e.g. assigning one
    // of its discovered hosts to a real endpoint elsewhere on the page.
    if (extraRange || extraIps.length > 0) {
      extraScanQuery.refetch();
    }
  };

  const handleConfirmScan = async (newRange: ScanNetworkRange | null, newExtraPorts: number[], newExtraIps: string[]) => {
    setExtraRange(newRange);
    setExtraIps(newExtraIps);
    if (newExtraPorts.length === 0) {
      setExtraPorts([]);
      return;
    }
    // Any port added here is persisted for this device (not just this one-time scan) - once
    // `refetchPorts` picks it up, it's part of `catalogPorts` and scanned automatically on every
    // future cycle, so it no longer needs to be tracked as a separate "extra" port here.
    try {
      await addDeviceScanPortsAsync({ deviceId, body: { ports: newExtraPorts } });
      await refetchPorts();
      setExtraPorts([]);
    } catch {
      // Persisting failed - fall back to at least scanning them once, same as before this port
      // list was persisted server-side, rather than silently dropping them.
      toast.error("Failed to save the additional ports for this device. Scanning them once instead.");
      setExtraPorts(newExtraPorts);
    }
  };

  // Checked before the scan-pipeline's own loading/error states, since the details pages fetch
  // their own data independently and shouldn't be blocked by those.
  if (detailsServiceId) {
    return (
      <div className="pt-2 pb-8 min-h-full">
        <ServiceDetailsPage
          serviceId={detailsServiceId}
          onBack={() => setDetailsServiceId(null)}
          onUpdated={handleRefresh}
        />
      </div>
    );
  }

  if (detailsEndpointId) {
    return (
      <div className="pt-2 pb-8 min-h-full">
        <EndpointDetailsPage
          endpointId={detailsEndpointId}
          onBack={() => setDetailsEndpointId(null)}
          onOpenServiceDetails={setDetailsServiceId}
          onUpdated={handleRefresh}
        />
      </div>
    );
  }

  if (isLoadingPorts || isLoadingRange) {
    return (
      <Centered>
        <p className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="animate-spin" /> Scanning network...
        </p>
      </Centered>
    );
  }

  if (isPortsError || isRangeError) {
    return (
      <Centered>
        <div className="flex flex-col items-center gap-3">
          <p className="text-sm text-destructive">Failed to determine what to scan for this device.</p>
          <Button
            variant="outline"
            onClick={() => {
              if (isPortsError) refetchPorts();
              if (isRangeError) refetchRange();
            }}
          >
            Retry
          </Button>
        </div>
      </Centered>
    );
  }

  // A failed fetch keeps the last successful `overview` in place (TanStack Query never clears
  // `data` on error) so a background tick's failure is silent and just shown again next tick.
  // Only when NEITHER source has ever produced anything - no live result and no configured data
  // either - is there truly nothing to show. And only when both are also actively erroring is it
  // a real failure needing a retry button; otherwise it's just the first tick still in flight.
  const hasNothingYet = overview === undefined && offlineFallbackQuery.data === undefined;

  if (hasNothingYet && overviewQuery.isError && offlineFallbackQuery.isError) {
    return (
      <Centered>
        <div className="flex flex-col items-center gap-3">
          <p className="text-sm text-destructive">Failed to scan the network. Please try again.</p>
          <Button variant="outline" onClick={handleRefresh}>
            Retry
          </Button>
        </div>
      </Centered>
    );
  }

  if (hasNothingYet) {
    return (
      <Centered>
        <p className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="animate-spin" /> Scanning network...
        </p>
      </Centered>
    );
  }

  // Configured endpoints (from the DB) are always merged in underneath whatever the live scan
  // currently finds - `mergeConfiguredEndpoints` lets live data (fresher) win per endpoint while
  // still keeping configured-only entries around, shown as offline. Keyed by `endpoint_id` rather
  // than `ip` here specifically, so multiple configured endpoints that happen to share an IP
  // (e.g. several instances of the same type before each has its own real IP entered) still all
  // show up instead of collapsing into one.
  const endpoints = mergeConfiguredEndpoints(
    mergeEndpointsByIp(overview?.endpoints ?? [], extraEndpoints),
    offlineFallbackQuery.data?.endpoints ?? [],
  );
  const discovered = endpoints.filter((e) => e.source !== "unidentified");
  const unidentified = endpoints.filter((e) => e.source === "unidentified");

  return (
    <div className="grid gap-4 pt-2">
      <DiscoveredEndpointsCard
        endpoints={discovered}
        deviceId={deviceId}
        onScan={() => setScanDialogOpen(true)}
        isScanning={isScanning}
        onAddEndpoint={() => setAddEndpointOpen(true)}
        onEndpointCreated={handleRefresh}
        onOpenDetails={setDetailsEndpointId}
        onOpenServiceDetails={setDetailsServiceId}
      />
      <UnidentifiedEndpointsCard endpoints={unidentified} deviceId={deviceId} onEndpointCreated={handleRefresh} />

      <ScanNetworkDialog
        open={scanDialogOpen}
        onOpenChange={setScanDialogOpen}
        extraPorts={extraPorts}
        extraIps={extraIps}
        autoPorts={catalogPorts ?? []}
        networkInput={rangeNetworkInput}
        maskInput={rangeMaskInput}
        onNetworkInputChange={setRangeNetworkInput}
        onMaskInputChange={setRangeMaskInput}
        onConfirm={handleConfirmScan}
      />

      <AssignEndpointDialog
        open={addEndpointOpen}
        onOpenChange={setAddEndpointOpen}
        deviceId={deviceId}
        onCreated={handleRefresh}
      />
    </div>
  );
}
