import createReactQueryClient from "openapi-react-query";
import createFetchClient, { Middleware } from "openapi-fetch";
import type { paths } from "./types";
import { getAccessToken } from "@/auth";

// oidc-client-ts's getUser() can, in rare cases (e.g. a stuck silent-renew iframe),
// hang far longer than any request should reasonably wait - bounding it here means a
// stuck token acquisition surfaces as a normal failed request instead of a request that
// never settles at all, no matter which screen/hook is waiting on it.
const TOKEN_ACQUISITION_TIMEOUT_MS = 8000;

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

export const authMiddleware: Middleware = {
  async onRequest({ request }) {
    const isCypress = window.Cypress != undefined

    if (isCypress) {
      return request
    }

    try {
      const token = await withTimeout(
        getAccessToken(),
        TOKEN_ACQUISITION_TIMEOUT_MS,
        "Timed out acquiring an access token",
      );
      request.headers.set("Authorization", `Bearer ${token}`);
    } catch (err) {
      console.error("Couldn't acquire token", err);
      throw new Error("User is not authenticated")
    }
    return request;
  },
};

export class ApiError extends Error {
  statusCode: number;
  message: string;
  details?: unknown;

  constructor(message: string, statusCode: number, details?: unknown) {
    super(message);
    this.message = message;
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.details = details;

    // This helps maintain the proper stack trace
    if ((Error as any).captureStackTrace) {
      (Error as any).captureStackTrace(this, ApiError);
    }
  }
}

export const errorHandlerMiddleware: Middleware = {
  async onResponse({ response }) {
    if (!response.ok) {
      const responseBody: unknown = await response.json().catch(() => null);
      const payload = responseBody && typeof responseBody === "object" ? responseBody as Record<string, unknown> : {};
      const message = typeof payload.message === "string" ? payload.message : `Request failed (${response.status})`;
      throw new ApiError(message, response.status, payload.errors);
    }
    return response;
  },
};

export const client = createFetchClient<paths>({
  baseUrl: `${import.meta.env.VITE_API_URI}`,
});

client.use(authMiddleware, errorHandlerMiddleware);

export const edgeApi = createReactQueryClient(client);
