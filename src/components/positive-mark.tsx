import type { ReactNode } from "react";

/** Lime "money is doing well" mark (FR-005); callers keep the "+" sign or a label so it is never color-only. */
export function PositiveMark({ children }: { children: ReactNode }) {
  return (
    <span className="inline-block rounded-sm bg-positive px-1.5 py-0.5 text-positive-foreground">
      {children}
    </span>
  );
}
