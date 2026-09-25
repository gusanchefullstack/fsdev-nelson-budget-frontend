import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

// Placeholder route target for redirects; the form lands with User Story 1.
export const Route = createFileRoute("/sign-in")({
  validateSearch: z.object({ redirect: z.string().optional() }),
  component: () => <h1 className="text-2xl font-bold">Sign in</h1>,
});
