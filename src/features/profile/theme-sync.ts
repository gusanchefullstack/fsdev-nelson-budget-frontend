import type { QueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { sessionQuery } from "@/lib/session";
import type { ThemePreference } from "@/stores/theme";

// Persists the theme on the profile so it follows the user across devices (FR-006).
// The cached session is updated too: the _authed guard re-applies its theme on every
// navigation, so a stale copy would revert the user's choice.
export function saveThemePreference(queryClient: QueryClient, themePreference: ThemePreference) {
  queryClient.setQueryData(sessionQuery.queryKey, (s) =>
    s ? { ...s, user: { ...s.user, themePreference } } : s,
  );
  void api("/me", { method: "PATCH", body: { themePreference } }).catch(() => {
    // Local choice already applied; a failed sync is not worth interrupting the user.
  });
}
