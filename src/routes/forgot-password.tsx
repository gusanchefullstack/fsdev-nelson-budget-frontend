import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/form-field";
import { AuthPage, FormAlert } from "@/features/auth/auth-page";
import { readAuthError } from "@/features/auth/auth-error";
import { emailSchema } from "@/features/auth/schemas";
import { authClient } from "@/lib/auth-client";
import { useZodForm } from "@/lib/forms";

export const Route = createFileRoute("/forgot-password")({ component: ForgotPassword });

function ForgotPassword() {
  const [sent, setSent] = useState(false);
  const [alert, setAlert] = useState<string>();
  const form = useZodForm(emailSchema, { email: "" });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const data = form.validate();
    if (!data) return;
    const { error } = await authClient.requestPasswordReset({
      email: data.email,
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error?.status === 429) return setAlert(readAuthError(error).message);
    // Same confirmation whether or not the email exists (FR-003a).
    setSent(true);
  }

  return (
    <AuthPage title="Reset your password">
      {sent ? (
        <div role="status" className="grid gap-3">
          <p>
            If an account uses that email, we've sent a link to reset your password. It works once
            and expires in 1 hour.
          </p>
          <Link to="/sign-in">Back to sign in</Link>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="grid max-w-sm gap-4">
          <FormAlert message={alert} />
          <FormField id="email" label="Email" required error={form.errors.email}>
            {(a) => (
              <Input
                {...a}
                type="email"
                autoComplete="email"
                value={form.values.email}
                onChange={(e) => form.set("email")(e.target.value)}
              />
            )}
          </FormField>
          <Button type="submit" className="justify-self-start">
            Send reset link
          </Button>
        </form>
      )}
    </AuthPage>
  );
}
