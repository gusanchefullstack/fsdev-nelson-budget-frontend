import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/form-field";
import { reauthCancelled, reauthSucceeded, sessionEvents } from "@/lib/api";
import { signInWithIdentifier } from "@/features/auth/sign-in";

/**
 * Opens over the current page when a request gets 401, so unsaved form data stays mounted.
 * After signing in again the paused request is retried.
 */
export function SessionExpiredDialog() {
  const [open, setOpen] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    const onExpired = () => setOpen(true);
    sessionEvents.addEventListener("session-expired", onExpired);
    return () => sessionEvents.removeEventListener("session-expired", onExpired);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    const message = await signInWithIdentifier(identifier, password);
    setPending(false);
    if (message) return setError(message);
    setPassword("");
    setError(undefined);
    setOpen(false);
    await queryClient.invalidateQueries({ queryKey: ["session"] });
    reauthSucceeded();
  }

  function leave() {
    setOpen(false);
    reauthCancelled();
    queryClient.clear();
    void navigate({ to: "/sign-in" });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && leave()}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Your session expired</DialogTitle>
          <DialogDescription>
            Sign in again to continue. What you were working on is kept.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-3" noValidate>
          <FormField id="reauth-identifier" label="Email or username" required>
            {(a) => (
              <Input
                {...a}
                autoComplete="username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
              />
            )}
          </FormField>
          <FormField id="reauth-password" label="Password" required error={error}>
            {(a) => (
              <Input
                {...a}
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            )}
          </FormField>
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" onClick={leave}>
              Go to sign in
            </Button>
            <Button type="submit" disabled={pending}>
              Sign in
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
