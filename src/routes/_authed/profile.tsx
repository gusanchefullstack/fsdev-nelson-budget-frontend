import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/form-field";
import { LoadingState } from "@/components/page-states";
import { ProfileFields, type ProfileValues } from "@/features/auth/profile-fields";
import { readAuthError } from "@/features/auth/auth-error";
import { emailSchema, profileSchema } from "@/features/auth/schemas";
import { profileQuery, useUpdateProfile, type Profile } from "@/features/profile/api";
import { authClient } from "@/lib/auth-client";
import { errorMessage } from "@/lib/error-messages";
import { useZodForm } from "@/lib/forms";

export const Route = createFileRoute("/_authed/profile")({
  loader: ({ context }) => context.queryClient.ensureQueryData(profileQuery),
  pendingComponent: () => <LoadingState label="Loading your profile" />,
  component: ProfilePage,
});

function ProfilePage() {
  const { data: profile } = useSuspenseQuery(profileQuery);
  return (
    <section aria-labelledby="profile-title" className="grid max-w-3xl gap-8">
      <div className="grid gap-1">
        <h1 id="profile-title" className="text-2xl font-bold">
          Profile
        </h1>
        <p className="text-muted-foreground">
          Signed in as <strong>{profile.username}</strong> (your username can't be changed).
        </p>
      </div>
      <EmailForm email={profile.email} />
      <ProfileForm profile={profile} />
    </section>
  );
}

function ProfileForm({ profile }: { profile: Profile }) {
  const update = useUpdateProfile();
  const form = useZodForm(profileSchema, {
    firstName: profile.firstName,
    lastName: profile.lastName,
    address: profile.address,
    city: profile.city,
    postalCode: profile.postalCode,
    state: profile.state,
    country: profile.country,
    phoneCountryCode: profile.phoneCountryCode,
    phoneNumber: profile.phoneNumber,
    timezone: profile.timezone,
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const data = form.validate();
    if (!data) return;
    update.mutate(data, {
      onSuccess: () => toast.success("Profile saved."),
      onError: (err) => {
        form.applyServerErrors(err);
        toast.error(errorMessage(err));
      },
    });
  }

  return (
    <form onSubmit={submit} noValidate aria-labelledby="details-title" className="grid gap-4">
      <h2 id="details-title" className="text-lg font-semibold">
        Personal details
      </h2>
      <ProfileFields
        values={form.values as ProfileValues}
        errors={form.errors}
        onChange={(field, value) => form.set(field)(value)}
        timezoneHint="New transactions use this timezone. Existing transactions keep the timezone they were recorded in."
      />
      <Button type="submit" disabled={update.isPending} className="justify-self-start">
        Save profile
      </Button>
    </form>
  );
}

function EmailForm({ email }: { email: string }) {
  const queryClient = useQueryClient();
  const [pending, setPending] = useState(false);
  const form = useZodForm(emailSchema, { email });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const data = form.validate();
    if (!data || data.email === email) return;
    setPending(true);
    const { error } = await authClient.changeEmail({ newEmail: data.email });
    setPending(false);
    if (error) {
      const { message, fields } = readAuthError(error);
      if (fields.newEmail) form.setErrors({ email: fields.newEmail });
      return toast.error(message);
    }
    toast.success("Email updated.");
    await queryClient.invalidateQueries({ queryKey: ["me"] });
    await queryClient.invalidateQueries({ queryKey: ["session"] });
  }

  return (
    <form
      onSubmit={submit}
      noValidate
      aria-labelledby="email-title"
      className="grid max-w-md gap-4"
    >
      <h2 id="email-title" className="text-lg font-semibold">
        Email
      </h2>
      <FormField id="profile-email" label="Email" required error={form.errors.email}>
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
      <Button type="submit" variant="outline" disabled={pending} className="justify-self-start">
        Update email
      </Button>
    </form>
  );
}
