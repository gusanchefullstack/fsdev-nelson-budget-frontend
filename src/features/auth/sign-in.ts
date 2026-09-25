import { authClient } from "@/lib/auth-client";
import { friendlyMessage } from "@/lib/error-messages";

/** Signs in with an email (contains "@") or a username. Returns an error message or undefined. */
export async function signInWithIdentifier(
  identifier: string,
  password: string,
): Promise<string | undefined> {
  const id = identifier.trim();
  const { error } = id.includes("@")
    ? await authClient.signIn.email({ email: id, password })
    : await authClient.signIn.username({ username: id.toLowerCase(), password });
  if (!error) return undefined;
  if (error.status === 429) return friendlyMessage("TOO_MANY_REQUESTS", error.message);
  if (error.status === 401 || error.status === 400 || error.status === 403)
    return "Invalid credentials.";
  return friendlyMessage(undefined);
}
