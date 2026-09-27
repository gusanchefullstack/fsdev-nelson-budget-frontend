import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** Styled native <select>: fully accessible and keyboard friendly on every device. */
export function NativeSelect({ className, ...props }: ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "h-8 w-full min-w-0 rounded-lg border border-input bg-background px-2.5 text-sm text-foreground",
        "aria-invalid:border-destructive disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
