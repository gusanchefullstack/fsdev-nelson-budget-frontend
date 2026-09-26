import { z } from "zod";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a date.");

export const itemSchema = z
  .object({
    name: z.string().trim().min(1, "Required.").max(80, "Use 80 characters or fewer."),
    description: z.string().trim().min(1, "Required.").max(500, "Use 500 characters or fewer."),
    startDate: date,
    endDate: date,
    estimatedAmount: z
      .string()
      .trim()
      .regex(/^\d{1,12}(\.\d{1,2})?$/, "Enter an amount with up to 2 decimals.")
      .refine((v) => Number(v) > 0, "The amount must be greater than 0."),
    firstExpectedDate: date,
    frequency: z.enum([
      "ONE_TIME",
      "DAILY",
      "WEEKLY",
      "BIWEEKLY",
      "MONTHLY",
      "QUARTERLY",
      "ANNUALLY",
      "CUSTOM_DAYS",
      "CUSTOM_MONTHS",
    ]),
    customInterval: z.string(),
  })
  .superRefine((v, ctx) => {
    if (v.endDate < v.startDate)
      ctx.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "The end date must be on or after the start date.",
      });
    if (v.firstExpectedDate < v.startDate || v.firstExpectedDate > v.endDate) {
      ctx.addIssue({
        code: "custom",
        path: ["firstExpectedDate"],
        message: "Must be between the start and end dates.",
      });
    }
    if (
      v.frequency.startsWith("CUSTOM_") &&
      !(Number(v.customInterval) >= 1 && Number.isInteger(Number(v.customInterval)))
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["customInterval"],
        message: "Enter a whole number of 1 or more.",
      });
    }
  });
