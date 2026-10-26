import { edgeApi } from "../api"

export function useListDeployments() {
    return edgeApi.useQuery("get", "/compose-deployments")
}

export function useGetActiveDeployment() {
    return edgeApi.useQuery("get", "/active-deployment")
}

export function useGetDeployment(name: string) {
    return edgeApi.useQuery("get", "/compose-deployments/{name}", {
        params: {
            path: { name },
        },
    })
}

export function useCreateOrUpdateDeployment() {
    return edgeApi.useMutation("put", "/compose-deployments/{name}")
}

export function useSetActiveDeployment() {
    return edgeApi.useMutation("put", "/active-deployment/{name}")
}

export function useDeleteActiveDeployment() {
    return edgeApi.useMutation("delete", "/active-deployment")
}

export function useDeleteDeployment() {
    return edgeApi.useMutation("delete", "/compose-deployments/{name}")
}