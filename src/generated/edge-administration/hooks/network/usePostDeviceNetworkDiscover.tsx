import { edgeApi } from "../../api";
import { components } from "../../types";

export type NetworkDiscover = components["schemas"]["NetworkDiscover"]
export type ScanResult = components["schemas"]["EndpointStatus"]

interface props {
  deviceId: string
  body: NetworkDiscover
  signal?: AbortSignal
}

export default function usePostDeviceNetworkDiscover() {
  // Runs on a background poll (every few seconds) as well as manual scans - it must not trigger
  // the app-wide invalidateQueries() in queryConfig.ts, or every unrelated query on the page
  // (devices, auth, twin config, topology...) refetches on every tick.
  const mutation = edgeApi.useMutation("post", "/{device}/network/discover", {
    meta: { skipGlobalInvalidate: true },
  })

  const mutateAsync = ({deviceId, body, signal}: props ) => mutation.mutateAsync({
    body,
    signal,
    params: {
      path: {
        device: deviceId
      }
    }
  })

  return {mutateAsync, isPending: mutation.isPending, data: mutation.data}
}
