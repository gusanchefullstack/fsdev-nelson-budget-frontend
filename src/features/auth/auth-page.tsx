import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Centered auth column: narrow for single-column forms, wide for sign-up's two columns. */
export function AuthPage({
  title,
  intro,
  size = "wide",
  children,
}: {
  title: string;
  intro?: ReactNode;
  size?: "narrow" | "wide";
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby="auth-title"
      className={cn("mx-auto grid w-full gap-6", size === "narrow" ? "max-w-sm" : "max-w-2xl")}
    >
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
