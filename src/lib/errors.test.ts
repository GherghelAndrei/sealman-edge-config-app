import { AxiosError, AxiosHeaders } from "axios";
import { describe, expect, it } from "vitest";
import { getHttpStatus, isForbidden, isTerminalConfigStatusError } from "./errors";
import { queryClient } from "@/config/queryConfig";

function axiosError(status: number) {
  return new AxiosError("Denied", undefined, undefined, undefined, {
    status, statusText: "Denied", data: {}, headers: {}, config: { headers: new AxiosHeaders() },
  });
}

describe("HTTP status handling", () => {
  it.each([400, 403, 500])("recognizes both clients' HTTP %s errors", (status) => {
    expect(getHttpStatus(axiosError(status))).toBe(status);
    expect(getHttpStatus(Object.assign(new Error("Denied"), { statusCode: status }))).toBe(status);
  });

  it("does not mistake transport errors for permission denials", () => {
    expect(isForbidden(new Error("Network unavailable"))).toBe(false);
    expect(getHttpStatus(null)).toBeUndefined();
    expect(isTerminalConfigStatusError({ statusCode: 404 })).toBe(false);
    expect(isTerminalConfigStatusError(axiosError(400))).toBe(true);
    expect(isTerminalConfigStatusError({ statusCode: 403 })).toBe(true);
  });

  it("does not retry either client's 400/403, but retains transient retries", () => {
    const retry = queryClient.getDefaultOptions().queries?.retry;
    if (typeof retry !== "function") throw new Error("Expected the configured retry function");
    for (const status of [400, 403]) {
      expect(retry(0, axiosError(status))).toBe(false);
      expect(retry(0, Object.assign(new Error("Denied"), { statusCode: status }))).toBe(false);
    }
    expect(retry(0, new Error("Network unavailable"))).toBe(true);
    expect(retry(2, new Error("Network unavailable"))).toBe(false);
  });
});
