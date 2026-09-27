import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";

type A11yProps = {
  id: string;
  "aria-invalid"?: true;
  "aria-describedby"?: string;
  required?: boolean;
};

type Props = {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: (props: A11yProps) => ReactNode;
};

/** Label + control + hint/error, wired with aria-describedby / aria-invalid. */
export function FormField({ id, label, error, hint, required, className, children }: Props) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  return (
    <div className={className ?? "grid content-start gap-1.5"}>
      <Label htmlFor={id}>
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </Label>
      {children({
        id,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": describedBy,
        required,
      })}
      {hint && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-xs font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
