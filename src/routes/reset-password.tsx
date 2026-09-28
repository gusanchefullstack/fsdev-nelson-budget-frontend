import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/form-field";
import { AuthPage, FormAlert } from "@/features/auth/auth-page";
import { passwordSchema } from "@/features/auth/schemas";
import { authClient } from "@/lib/auth-client";
import { useZodForm } from "@/lib/forms";

export const Route = createFileRoute("/reset-password")({
  validateSearch: z.object({ token: z.string().optional() }),
  component: ResetPassword,
});

const INVALID_LINK = "This reset link is invalid, already used or expired. Request a new one.";

function ResetPassword() {
  const { token } = Route.useSearch();
  const [done, setDone] = useState(false);
  const [alert, setAlert] = useState<string | undefined>(token ? undefined : INVALID_LINK);
  const form = useZodForm(passwordSchema, { password: "" });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const data = form.validate();
    if (!data || !token) return;
    const { error } = await authClient.resetPassword({ token, newPassword: data.password });
    if (error) return setAlert(INVALID_LINK);
    setDone(true);
  }

  return (
    <AuthPage title="Choose a new password" size="narrow">
      {done ? (
        <p role="status">
          Your password was changed. <Link to="/sign-in">Sign in</Link>
        </p>
      ) : (
        <form onSubmit={submit} noValidate className="grid gap-4">
          <FormAlert message={alert} />
          {alert === INVALID_LINK && <Link to="/forgot-password">Request a new link</Link>}
          <FormField
            id="password"
            label="New password"
            required
            error={form.errors.password}
            hint="At least 8 characters."
          >
            {(a) => (
              <Input
                {...a}
                type="password"
                autoComplete="new-password"
                value={form.values.password}
                onChange={(e) => form.set("password")(e.target.value)}
              />
            )}
          </FormField>
          <Button type="submit" disabled={!token} className="justify-self-start">
            Save new password
          </Button>
        </form>
      )}
    </AuthPage>
  );
}
