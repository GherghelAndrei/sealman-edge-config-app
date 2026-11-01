export type PanelProps<Context> = {
  context: Context;
  api(path: string, init?: RequestInit): Promise<Response>; // host adds base URL + bearer token; API origin only
  notify(message: string, severity?: "info" | "success" | "warning" | "error"): void;
  onDataChanged(): void; // tell the host page to refetch what it shows
};

export type BaseContext = { user: { id: string; name: string } };
export type GlobalContext = BaseContext;
export type DeviceContext = BaseContext & { deviceId: string; deviceTypeId: string; canEdit: boolean };
export type EndpointContext = DeviceContext & { endpointId: string; endpointTypeId: string };
export type ModuleContext = DeviceContext & { moduleId: string; moduleType: string; moduleVersion: string };
// tab and page panels also get: subPath (the URL part after the contribution's path)
export type RoutedContext<C> = C & { subPath: string };
