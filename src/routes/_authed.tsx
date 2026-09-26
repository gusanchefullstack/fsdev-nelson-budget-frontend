import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { sessionQuery } from "@/lib/session";
import { useThemeStore, type ThemePreference } from "@/stores/theme";

// Every page under _authed needs a session; otherwise go to sign-in.
export const Route = createFileRoute("/_authed")({
  beforeLoad: async ({ context, location }) => {
    const session = await context.queryClient.ensureQueryData(sessionQuery);
    if (!session) throw redirect({ to: "/sign-in", search: { redirect: location.href } });
    // The saved theme follows the user across devices (FR-006).
    const saved = session.user.themePreference as ThemePreference | undefined;
    const theme = useThemeStore.getState();
    if (saved && saved !== theme.preference) theme.setPreference(saved);
    return { user: session.user };
  },
  component: Outlet,
});
