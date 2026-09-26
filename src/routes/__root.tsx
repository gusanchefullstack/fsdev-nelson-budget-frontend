import type { QueryClient } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  Link,
  Outlet,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { AppHeader } from "@/components/app-header";
import { SessionExpiredDialog } from "@/components/session-expired-dialog";
import { errorMessage } from "@/lib/error-messages";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: RootLayout,
  errorComponent: RootError,
  notFoundComponent: NotFound,
});

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-background focus:p-2"
      >
        Skip to content
      </a>
      <AppHeader />
      {/* The only <main> on every page */}
      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-6xl px-4 py-6 outline-none">
        {children}
      </main>
      <SessionExpiredDialog />
      <Toaster position="top-center" expand />
    </>
  );
}

function RootLayout() {
  return (
    <Shell>
      <Outlet />
    </Shell>
  );
}

function RootError({ error, reset }: ErrorComponentProps) {
  return (
    <Shell>
      <div role="alert" className="grid justify-items-start gap-4">
        <h1 className="text-2xl font-bold">Something went wrong</h1>
        <p>{errorMessage(error)}</p>
        <Button onClick={reset}>Try again</Button>
      </div>
    </Shell>
  );
}

function NotFound() {
  return (
    <div className="grid justify-items-start gap-4">
      <h1 className="text-2xl font-bold">Page not found</h1>
      <p>We couldn't find that page.</p>
      <Link to="/">Go to the dashboard</Link>
    </div>
  );
}
