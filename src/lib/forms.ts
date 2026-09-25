import { useState } from "react";
import type { z } from "zod";
import { ApiError } from "./api";

export function zodFields(error: z.ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    fields[key] ??= issue.message;
  }
  return fields;
}

/** Minimal form state: values, client validation with Zod, and server field errors. */
export function useZodForm<S extends z.ZodType<unknown, Record<string, unknown>>>(
  schema: S,
  initial: z.input<S>,
) {
  const [values, setValues] = useState<z.input<S>>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set =
    <K extends keyof z.input<S>>(key: K) =>
    (value: z.input<S>[K]) =>
      setValues((v) => ({ ...v, [key]: value }));

  function validate(): z.output<S> | null {
    const result = schema.safeParse(values);
    if (!result.success) {
      setErrors(zodFields(result.error));
      return null;
    }
    setErrors({});
    return result.data;
  }

  function applyServerErrors(error: unknown) {
    if (error instanceof ApiError && error.fields) setErrors(error.fields);
  }

  return { values, setValues, set, errors, setErrors, validate, applyServerErrors };
}
