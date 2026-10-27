import { ApiError } from "@/generated/edge-administration/api";
import { extensionErrorMessages, isExtensionsDisabledError } from "./extensionErrors";

describe("isExtensionsDisabledError", () => {
  it("recognizes the missing management API when extensions are disabled", () => {
    expect(isExtensionsDisabledError(new ApiError("Not found", 404))).toBe(true);
  });

  it("does not hide unrelated backend failures", () => {
    expect(isExtensionsDisabledError(new ApiError("Unavailable", 503))).toBe(false);
    expect(isExtensionsDisabledError(new Error("Network error"))).toBe(false);
  });

  it("formats backend field validation errors for extension forms", () => {
    const error = new ApiError("Request validation failed", 400, [
      { location: "upstreams.catalog.http.base_url", message: "Value error, host is not allowed" },
    ]);

    expect(extensionErrorMessages(error, "Fallback")).toEqual([
      "upstreams.catalog.http.base_url: Value error, host is not allowed",
    ]);
  });
});