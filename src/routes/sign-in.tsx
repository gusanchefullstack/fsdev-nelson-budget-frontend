import { useState } from "react";
import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/form-field";
import { AuthPage, FormAlert } from "@/features/auth/auth-page";
import { signInSchema } from "@/features/auth/schemas";
import { signInWithIdentifier } from "@/features/auth/sign-in";
import { useZodForm } from "@/lib/forms";
import { sessionQuery } from "@/lib/session";

// Only same-app paths are allowed as redirect targets.
const safeTarget = (to?: string) => (to?.startsWith("/") && !to.startsWith("//") ? to : "/");

export const Route = createFileRoute("/sign-in")({
  validateSearch: z.object({ redirect: z.string().optional() }),
  // Already signed in: skip the form.
  beforeLoad: async ({ context, search }) => {
    if (await context.queryClient.ensureQueryData(sessionQuery))
      throw redirect({ to: safeTarget(search.redirect) });
  },
  component: SignIn,
});

function SignIn() {
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [alert, setAlert] = useState<string>();
  const [pending, setPending] = useState(false);
  const form = useZodForm(signInSchema, { identifier: "", password: "" });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const data = form.validate();
    if (!data) return;
    setPending(true);
    const error = await signInWithIdentifier(data.identifier, data.password);
    setPending(false);
    if (error) return setAlert(error);
    // Refetch even if nothing observes it: the guard may have cached "signed out".
    await queryClient.invalidateQueries({ queryKey: ["session"], refetchType: "all" });
    await navigate({ to: safeTarget(redirect) });
  }

  return (
    <AuthPage
      title="Sign in to Nelson"
      size="narrow"
      intro={
        <>
          New here? <Link to="/sign-up">Create an account</Link>.
        </>
      }
    >
      <form onSubmit={submit} noValidate className="grid gap-4">
        <FormAlert message={alert} />
        <FormField
          id="identifier"
          label="Email or username"
          required
          error={form.errors.identifier}
        >
          {(a) => (
            <Input
              {...a}
              autoComplete="username"
              value={form.values.identifier}
              onChange={(e) => form.set("identifier")(e.target.value)}
            />
          )}
        </FormField>
        <FormField id="password" label="Password" required error={form.errors.password}>
          {(a) => (
            <Input
              {...a}
              type="password"
              autoComplete="current-password"
              value={form.values.password}
              onChange={(e) => form.set("password")(e.target.value)}
            />
          )}
        </FormField>
        <div className="flex flex-wrap items-center gap-4">
          <Button type="submit" disabled={pending}>
            {pending ? "Signing in…" : "Sign in"}
          </Button>
          <Link to="/forgot-password">Forgot your password?</Link>
        </div>
      </form>
    </AuthPage>
  );
}
