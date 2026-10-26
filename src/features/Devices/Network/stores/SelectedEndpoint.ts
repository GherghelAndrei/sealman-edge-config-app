import { EndpointConfig } from "@/api/edgeConfig/networkDiscover/networkDiscoverInterfaces"
import { create } from "zustand"
import { getEndpointTypes , getServices } from "../api/networkMeta"

export interface SelectedEndpointStore {
  name: string
  description?: string
  services: Record<string, string>
  initialConfig: EndpointConfig
  setSelectedEndpointState: (data: EndpointConfig , selectedIp: string) => void
  updateDescription: (descripton: string) => void
  updateName: (name: string) => void;
  updateServiceNameByPort: (port: number, name: string) => void;
  resetNameAndDescription: () => void;
  resetServices: () => void;
}
export function getPortServiceMap(){
  const servicesArr = getServices() ?? []

  return servicesArr.reduce<Record<any, string>>((acc, service: any) => {
    const port = Number(service.defaultPort)
    acc[port] = service.deviceEndpointServiceName
    return acc
  }, {})
}

export function getPortMappingName(port : any , services : any){
  const portServiceMap = getPortServiceMap()
  let data : any

  if(services[port] === "" || services[port] == null || services[port] === undefined){
    data = portServiceMap[port] ? portServiceMap[port] : ""
  } else {
    data = services[port]
  }

return data
}


export default create<SelectedEndpointStore>((set) => {
  return {
    name: "",
    services: {},
    initialConfig: { name: "", serviceNames: {}},
    setSelectedEndpointState: (data, selectedIp) => {
      const endpointTypesArr = getEndpointTypes() ?? []
      let machineNameIndex = endpointTypesArr?.findIndex(obj => obj.defaultIP === selectedIp)
      let currentMachineName = endpointTypesArr[machineNameIndex]?.name
      let currentMachineDescription = endpointTypesArr[machineNameIndex]?.description ?? undefined

      const portServiceMap = getPortServiceMap()
      const mergedServices: Record<string, string> = {}
      for (const port in data.serviceNames) {
        const saved = data.serviceNames[port]
        mergedServices[port] = saved || portServiceMap[Number(port)] || ""
      }

      set(() => ({
        name: !data.name ? currentMachineName : data.name,
        description: !data.description ? currentMachineDescription : data.description,
        services: mergedServices,
        initialConfig: data
      }))
    },
    updateDescription: (description) => set({description}),
    updateName: (name) => set({name}),
    updateServiceNameByPort: (port, serviceName) => set((state) => ({
      services: {
        ...state.services,
        [port]: serviceName
      }
    })),
    resetNameAndDescription: () => set((state) => (
      {
        name: state.initialConfig.name,
        description: state.initialConfig.description
      }
    )),
    resetServices: () => set((state) => ({services: state.initialConfig.serviceNames}))
  }
})
