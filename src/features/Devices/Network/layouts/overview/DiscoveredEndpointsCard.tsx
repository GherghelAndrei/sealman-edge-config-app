import { Loader2, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion } from "@/components/ui/accordion";
import EndpointAccordionItem from "./EndpointAccordionItem";
import { MappedEndpoint } from "@/generated/edge-administration/hooks/network/usePostNetworkOverview";
import { endpointListKey } from "./overviewMerge";

interface props {
  endpoints: MappedEndpoint[];
  deviceId: string;
  onScan: () => void;
  isScanning: boolean;
  onAddEndpoint: () => void;
  onEndpointCreated: () => void;
  onOpenDetails: (endpointId: string) => void;
  onOpenServiceDetails: (serviceId: string) => void;
}

export default function DiscoveredEndpointsCard({
  endpoints,
  deviceId,
  onScan,
  isScanning,
  onAddEndpoint,
  onEndpointCreated,
  onOpenDetails,
  onOpenServiceDetails,
}: props) {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1.5">
          <h2 className="text-lg font-semibold leading-none tracking-tight">Discovered Endpoints</h2>
          <p className="text-sm text-muted-foreground">
            Physical machines and systems discovered on the network. Expand each endpoint to view its services.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" onClick={onScan} disabled={isScanning}>
            {isScanning ? <Loader2 className="animate-spin" /> : <Search />}
            {isScanning ? "Scanning..." : "Scan Network"}
          </Button>
          <Button variant="outline" onClick={onAddEndpoint}>
            <Plus /> Add Endpoint
          </Button>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden bg-background">
        {endpoints.length === 0 ? (
          <p className="text-sm text-muted-foreground p-4">No endpoints discovered yet.</p>
        ) : (
          <Accordion type="single" collapsible className="w-full">
            {endpoints.map((endpoint) => (
              <EndpointAccordionItem
                key={endpointListKey(endpoint)}
                endpoint={endpoint}
                deviceId={deviceId}
                onCreated={onEndpointCreated}
                onOpenDetails={onOpenDetails}
                onOpenServiceDetails={onOpenServiceDetails}
              />
            ))}
          </Accordion>
        )}
      </div>
    </div>
  );
}
