import { z } from "zod";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a date.");

export const budgetSchema = z
  .object({
    name: z.string().trim().min(1, "Required.").max(80, "Use 80 characters or fewer."),
    description: z.string().trim().max(500, "Use 500 characters or fewer."),
    currency: z.enum(["USD", "COP"], "Choose a currency."),
    startDate: date,
    endDate: date,
  })
  .refine((v) => v.endDate > v.startDate, {
    message: "The end date must be after the start date.",
    path: ["endDate"],
  });

export const categorySchema = z.object({
  type: z.enum(["INCOME", "EXPENSE"]),
  name: z.string().trim().min(1, "Required.").max(80, "Use 80 characters or fewer."),
  description: z.string().trim().max(500, "Use 500 characters or fewer."),
});
