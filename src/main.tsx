import "temporal-polyfill/global";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { ApiError } from "@/lib/api";
import { initTheme } from "@/stores/theme";
import { routeTree } from "./routeTree.gen";
import "./index.css";

initTheme();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Client errors (4xx) won't fix themselves; only retry network/server failures.
      retry: (count, error) =>
        !(error instanceof ApiError && error.status >= 400 && error.status < 500) && count < 2,
    },
  },
});

const router = createRouter({ routeTree, context: { queryClient }, defaultPreload: "intent" });

// Move focus to the new page's main content so keyboard and screen-reader users land there.
// The first page load keeps the browser default so Tab reaches "Skip to content" first.
let firstLoad = true;
router.subscribe("onResolved", ({ pathChanged }) => {
  if (firstLoad) {
    firstLoad = false;
    return;
  }
  if (pathChanged) document.getElementById("main")?.focus({ preventScroll: true });
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
