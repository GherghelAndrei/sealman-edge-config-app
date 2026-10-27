import { ApiError } from "@/generated/edge-administration/api";

export function isExtensionsDisabledError(error: unknown): error is ApiError {
  return error instanceof ApiError && error.statusCode === 404;
}

interface ValidationErrorDetail {
  location?: unknown;
  message?: unknown;
}

export function extensionErrorMessages(error: unknown, fallback: string): string[] {
  if (error instanceof ApiError && Array.isArray(error.details)) {
    const messages = error.details.flatMap((detail: ValidationErrorDetail) => {
      if (typeof detail.message !== "string") return [];
      const location = typeof detail.location === "string" && detail.location ? `${detail.location}: ` : "";
      return [`${location}${detail.message}`];
    });
    if (messages.length > 0) return messages;
  }
  if (error instanceof Error && error.message) return [error.message];
  return [fallback];
}