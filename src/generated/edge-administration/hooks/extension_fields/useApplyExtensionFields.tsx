import { edgeApi } from "@/generated/edge-administration/api";
import { components } from "@/generated/edge-administration/types";

export type ApplyExtensionFieldsRequest = components["schemas"]["ApplyExtensionFieldsRequest"];
export type ApplyExtensionFieldsResponse = components["schemas"]["ApplyExtensionFieldsResponse"];

export function useApplyExtensionFields() {
  const mutation = edgeApi.useMutation("post", "/extension-fields/{extension}/apply");

  const applyExtensionFields = async ({
    extension,
    body,
  }: {
    extension: string;
    body: ApplyExtensionFieldsRequest;
  }): Promise<ApplyExtensionFieldsResponse> => {
    return mutation.mutateAsync({
      params: {
        path: { extension },
      },
      body,
    });
  };

  return { applyExtensionFields, isPending: mutation.isPending };
}
