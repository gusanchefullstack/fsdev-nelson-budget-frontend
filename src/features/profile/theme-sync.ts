import { api } from "@/lib/api";
import type { ThemePreference } from "@/stores/theme";

// Persists the theme on the profile so it follows the user across devices (FR-006).
export function saveThemePreference(themePreference: ThemePreference) {
  void api("/me", { method: "PATCH", body: { themePreference } }).catch(() => {
    // Local choice already applied; a failed sync is not worth interrupting the user.
  });
}
