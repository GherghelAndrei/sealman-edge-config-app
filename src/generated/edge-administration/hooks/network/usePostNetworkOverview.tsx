import { edgeApi } from "../../api";
import { components } from "../../types";

export type NetworkScan = components["schemas"]["NetworkScan-Input"]
export type NetworkOverview = components["schemas"]["NetworkOverview"]
export type MappedEndpoint = components["schemas"]["MappedEndpoint"]
export type MappedPort = components["schemas"]["MappedPort"]

interface props {
  deviceId: string
  body: NetworkScan
  signal?: AbortSignal
}

export default function usePostNetworkOverview() {
  // See usePostDeviceNetworkDiscover.tsx - same background-poll rationale for skipping the
  // app-wide invalidateQueries() on every mutation success.
  const mutation = edgeApi.useMutation("post", "/{device}/network/overview", {
    meta: { skipGlobalInvalidate: true },
  })

  const mutateAsync = ({ deviceId, body, signal }: props) => mutation.mutateAsync({
    body,
    signal,
    params: {
      path: {
        device: deviceId
      }
    }
  })

  return { mutateAsync, isPending: mutation.isPending, data: mutation.data }
}
