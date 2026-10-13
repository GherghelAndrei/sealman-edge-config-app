import { CircleHelp } from "lucide-react";
import { Accordion } from "@/components/ui/accordion";
import EndpointAccordionItem from "./EndpointAccordionItem";
import { MappedEndpoint } from "@/generated/edge-administration/hooks/network/usePostNetworkOverview";
import { endpointListKey } from "./overviewMerge";

interface props {
  endpoints: MappedEndpoint[];
  deviceId: string;
  onEndpointCreated: () => void;
}

export default function UnidentifiedEndpointsCard({ endpoints, deviceId, onEndpointCreated }: props) {
  if (endpoints.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <h2 className="flex items-center gap-2 text-lg font-semibold leading-none tracking-tight">
          <CircleHelp className="w-5 h-5 text-orange-500" />
          Unidentified Endpoints
        </h2>
        <p className="text-sm text-muted-foreground">
          Devices discovered on the network that haven&apos;t been identified yet. Assign them a type.
        </p>
      </div>

      <div className="border border-orange-200 rounded-lg overflow-hidden bg-background">
        <Accordion type="single" collapsible className="w-full">
          {endpoints.map((endpoint) => (
            <EndpointAccordionItem
              key={endpointListKey(endpoint)}
              endpoint={endpoint}
              deviceId={deviceId}
              onCreated={onEndpointCreated}
              onOpenDetails={() => {}}
              onOpenServiceDetails={() => {}}
            />
          ))}
        </Accordion>
      </div>
    </div>
  );
}
