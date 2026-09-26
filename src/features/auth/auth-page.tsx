import type { ReactNode } from "react";

export function AuthPage({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby="auth-title" className="mx-auto grid w-full max-w-2xl gap-6">
      <div className="grid gap-2">
        <h1 id="auth-title" className="text-2xl font-bold">
          {title}
        </h1>
        {intro && <div className="text-muted-foreground">{intro}</div>}
      </div>
      {children}
    </section>
  );
}

export function FormAlert({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded-md border border-destructive/50 px-3 py-2 text-sm text-destructive"
    >
      {message}
    </p>
  );
}
