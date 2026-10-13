import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Accordion } from "@/components/ui/accordion";
import type { MappedEndpoint } from "@/generated/edge-administration/hooks/network/usePostNetworkOverview";
import EndpointAccordionItem from "../EndpointAccordionItem";
import { endpointListKey } from "../overviewMerge";

const { typesRef } = vi.hoisted(() => ({ typesRef: { current: [] as unknown[] } }));

vi.mock("@/generated/edge-administration/hooks/endpoint_types/useGetEndpointTypes", () => ({
  default: () => ({ data: typesRef.current }),
}));
vi.mock("@/features/authorization/permissions/use-permissions", () => ({
  usePermissions: () => ({ hasPermission: true }),
}));
vi.mock("../AssignEndpointDialog", () => ({ default: () => null }));
vi.mock("../AssignServiceDialog", () => ({ default: () => null }));
vi.mock("../BrowseDialog", () => ({ default: () => null }));

const STRING = { type: "string", ui: "input", required: false, changeable: true, show_in_list: true, default: null } as const;

function renderItem(endpoint: MappedEndpoint) {
  return render(
    <Accordion type="single" defaultValue={endpointListKey(endpoint)}>
      <EndpointAccordionItem endpoint={endpoint} deviceId="dev-1" onCreated={() => {}} onOpenDetails={() => {}} onOpenServiceDetails={() => {}} />
    </Accordion>
  );
}

describe("EndpointAccordionItem", () => {
  beforeEach(() => {
    typesRef.current = [
      { type_id: "plc", label: "PLC", description: null, fields: {}, mapping: { title: "name", addr: "ip" } },
      { type_id: "sensor", label: "Sensor", description: null, fields: {}, mapping: {} },
    ];
  });

  it("uses the name-role value as title", () => {
    renderItem({
      endpoint_id: "e1", type_id: "plc", type_label: "PLC", ip: "10.0.0.1", status: "online", source: "configured", ports: [],
      endpoint_data: {
        title: { value: "Press 1", field: { ...STRING, label: "Title" } },
        addr: { value: "10.0.0.1", field: { ...STRING, label: "Address" } },
      },
    });
    expect(screen.getByText("Press 1")).toBeInTheDocument();
  });

  it("shows a field called ip without the ip role as extra info", () => {
    renderItem({
      endpoint_id: "e2", type_id: "sensor", type_label: "Sensor", status: "unknown", source: "configured", ports: [],
      endpoint_data: { ip: { value: "192.168.9.9", field: { ...STRING, label: "Old IP" } } },
    });
    expect(screen.getByText(/192\.168\.9\.9/)).toBeInTheDocument();
  });

  it("hides role fields from the extra info", () => {
    renderItem({
      endpoint_id: "e3", type_id: "plc", type_label: "PLC", ip: "10.0.0.3", status: "online", source: "configured", ports: [],
      endpoint_data: { title: { value: "Press 3", field: { ...STRING, label: "Title" } }, addr: { value: "10.0.0.3", field: { ...STRING, label: "Address" } } },
    });
    expect(screen.queryByText(/Press 3 ·/)).not.toBeInTheDocument();
  });

  it("lists an endpoint without IP with the type label as title and unknown services", () => {
    renderItem({
      endpoint_id: "e4", type_id: "sensor", type_label: "Sensor", status: "unknown", source: "configured",
      endpoint_data: {},
      ports: [{ status: "unknown", source: "configured", service_id: "s1", type_label: "Modbus" }],
    });
    expect(screen.getByText("Sensor")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Details" })).toBeInTheDocument();
    expect(screen.getByText("Unknown")).toBeInTheDocument();
    expect(screen.getByText("Modbus")).toBeInTheDocument();
  });
});
