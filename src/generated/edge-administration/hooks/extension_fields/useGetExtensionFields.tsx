import { edgeApi } from "@/generated/edge-administration/api";
import { components } from "@/generated/edge-administration/types";

export type ExtensionFieldSet = components["schemas"]["ExtensionFieldSet"];

export default function useGetExtensionFields() {
  return edgeApi.useQuery("get", "/extension-fields");
}
