import { edgeApi } from "../api"

export function useListExtensions() {
    return edgeApi.useQuery("get", "/extensions")
}

export function useGetExtension(name: string) {
    return edgeApi.useQuery("get", "/extensions/{name}", {
        params: { path: { name } },
    })
}

export function useGetExtensionSchema() {
    return edgeApi.useQuery("get", "/extensions/schema")
}

export function useRegisterExtension() {
    return edgeApi.useMutation("post", "/extensions")
}

export function useReplaceExtension() {
    return edgeApi.useMutation("put", "/extensions/{name}")
}

export function useDeleteExtension() {
    return edgeApi.useMutation("delete", "/extensions/{name}")
}

export function useEnableExtension() {
    return edgeApi.useMutation("post", "/extensions/{name}/enable")
}

export function useDisableExtension() {
    return edgeApi.useMutation("post", "/extensions/{name}/disable")
}

export function useCheckExtensionHealth() {
    // A health check has no bearing on the rest of the app's data - opt out of the
    // blanket invalidateQueries() in queryConfig.ts so it doesn't force-refetch every
    // other query (including the extensions list itself) on every successful check.
    return edgeApi.useMutation("post", "/extensions/{name}/health-check", {
        meta: { skipGlobalInvalidate: true },
    })
}

export function useRotateExtensionInternalKey() {
    return edgeApi.useMutation("post", "/extensions/{name}/internal-key/rotate")
}
