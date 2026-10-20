import { renderHook } from "@/utils/test-utils";
import { edgeApi } from "../../../api";
import { useApplyExtensionFields } from "../useApplyExtensionFields";

describe("useApplyExtensionFields", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sends POST /extension-fields/{extension}/apply with the body", async () => {
    const response = { applied: [{ type_id: "printer", key: "serial_number" }], skipped: [] };
    const mutateAsync = vi.fn().mockResolvedValue(response);
    const useMutationSpy = vi.spyOn(edgeApi, "useMutation").mockReturnValue({
      mutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof edgeApi.useMutation>);

    const { result } = renderHook(() => useApplyExtensionFields());
    const body = { type_ids: ["printer"], keys: ["serial_number"] };

    await expect(result.current.applyExtensionFields({ extension: "inventory", body })).resolves.toEqual(response);

    expect(useMutationSpy).toHaveBeenCalledWith("post", "/extension-fields/{extension}/apply");
    expect(mutateAsync).toHaveBeenCalledWith({
      params: { path: { extension: "inventory" } },
      body,
    });
    expect(result.current.isPending).toBe(false);
  });
});
