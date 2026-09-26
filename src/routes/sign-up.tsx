import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/form-field";
import { AuthPage, FormAlert } from "@/features/auth/auth-page";
import { ProfileFields, type ProfileValues } from "@/features/auth/profile-fields";
import { readAuthError } from "@/features/auth/auth-error";
import { signUpSchema } from "@/features/auth/schemas";
import { authClient } from "@/lib/auth-client";
import { useZodForm } from "@/lib/forms";
import { deviceTimezone } from "@/lib/temporal";

export const Route = createFileRoute("/sign-up")({ component: SignUp });

function SignUp() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [alert, setAlert] = useState<string>();
  const [pending, setPending] = useState(false);
  const form = useZodForm(signUpSchema, {
    username: "",
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    address: "",
    city: "",
    postalCode: "",
    state: "",
    country: "",
    phoneCountryCode: "",
    phoneNumber: "",
    timezone: deviceTimezone(), // FR-001: pre-filled from the device
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const data = form.validate();
    if (!data) return setAlert("Please check the highlighted fields.");
    setPending(true);
    const { error } = await authClient.signUp.email({
      ...data,
      username: data.username.toLowerCase(),
      name: `${data.firstName} ${data.lastName}`,
    });
    setPending(false);
    if (error) {
      const { message, fields } = readAuthError(error);
      form.setErrors(fields);
      return setAlert(message);
    }
    await queryClient.invalidateQueries({ queryKey: ["session"] });
    await navigate({ to: "/" });
  }

  const onChange = (field: keyof ProfileValues, value: string) => form.set(field)(value);

  return (
    <AuthPage
      title="Create your Nelson account"
      intro={
        <>
          Already have an account? <Link to="/sign-in">Sign in</Link>. All fields are required.
        </>
      }
    >
      <form onSubmit={submit} noValidate className="grid gap-6">
        <FormAlert message={alert} />
        <fieldset className="grid gap-4 md:grid-cols-2">
          <legend className="mb-2 font-semibold">Account</legend>
          <FormField
            id="username"
            label="Username"
            required
            error={form.errors.username}
            hint="3–30 letters, numbers, _ or ."
          >
            {(a) => (
              <Input
                {...a}
                autoComplete="username"
                value={form.values.username}
                onChange={(e) => form.set("username")(e.target.value)}
              />
            )}
          </FormField>
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
          <FormField
            id="password"
            label="Password"
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
        </fieldset>
        <fieldset className="grid gap-4">
          <legend className="mb-2 font-semibold">Profile</legend>
          <ProfileFields
            values={form.values as ProfileValues}
            errors={form.errors}
            onChange={onChange}
            timezoneHint="Your transactions use this timezone. It only changes if you edit it."
          />
        </fieldset>
        <Button type="submit" disabled={pending} className="justify-self-start">
          {pending ? "Creating account…" : "Create account"}
        </Button>
      </form>
    </AuthPage>
  );
}
