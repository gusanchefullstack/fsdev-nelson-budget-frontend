import { friendlyMessage } from "@/lib/error-messages";

type AuthError = {
  status?: number;
  code?: string;
  message?: string;
  fields?: Record<string, string>;
} | null;

/** Maps a Better Auth client error to a friendly message and field errors. */
export function readAuthError(error: AuthError): {
  message: string;
  fields: Record<string, string>;
} {
  if (!error) return { message: "", fields: {} };
  if (error.status === 429)
    return { message: friendlyMessage("TOO_MANY_REQUESTS", error.message), fields: {} };
  if (error.fields) return { message: friendlyMessage("VALIDATION_ERROR"), fields: error.fields };
  return { message: friendlyMessage(undefined), fields: {} };
}
