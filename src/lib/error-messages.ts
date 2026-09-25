import { ApiError } from "./api";

// Friendly text per API error code; the UI never shows raw error text (FR-061).
const MESSAGES: Record<string, string> = {
  BAD_REQUEST: "Something about that request didn't look right. Please try again.",
  UNAUTHENTICATED: "Please sign in to continue.",
  NOT_FOUND: "We couldn't find that item. It may have been deleted.",
  CONFLICT: "That change conflicts with existing data.",
  VALIDATION_ERROR: "Please check the highlighted fields.",
  TOO_MANY_REQUESTS: "Too many attempts. Please wait a few minutes and try again.",
  NETWORK: "We couldn't reach Nelson. Check your connection and try again.",
  INTERNAL_ERROR: "Something went wrong on our side. Please try again.",
};

export const DEFAULT_ERROR = MESSAGES.INTERNAL_ERROR!;

export function friendlyMessage(code: string | undefined, serverMessage?: string): string {
  // Server messages for these codes are written for users (e.g. naming an overlapping budget).
  if (
    serverMessage &&
    (code === "CONFLICT" || code === "VALIDATION_ERROR" || code === "TOO_MANY_REQUESTS")
  ) {
    return serverMessage;
  }
  return (code && MESSAGES[code]) || DEFAULT_ERROR;
}

/** Friendly text for any thrown value (ApiError or unexpected). */
export function errorMessage(error: unknown): string {
  return error instanceof ApiError ? friendlyMessage(error.code, error.message) : DEFAULT_ERROR;
}
