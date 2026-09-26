import { z } from "zod";

const optional = (schema: z.ZodString) => z.union([z.literal(""), schema]);

export const partySchema = z.object({
  name: z.string().trim().min(1, "Required.").max(80, "Use 80 characters or fewer."),
  description: z.string().trim().max(500, "Use 500 characters or fewer."),
  type: z.string().min(1, "Choose a type."),
  currency: z.enum(["USD", "COP"]),
  openingBalance: z.string(),
  address: z.string().trim().max(200),
  city: z.string().trim().max(100),
  postalCode: z.string().trim().max(20),
  state: z.string().trim().max(100),
  country: optional(z.string().regex(/^[A-Z]{2}$/, "Choose a country.")),
  phoneCountryCode: optional(
    z
      .string()
      .trim()
      .regex(/^\+\d{1,3}$/, "Use + and 1–3 digits."),
  ),
  phoneNumber: optional(
    z
      .string()
      .trim()
      .regex(/^\d{4,15}$/, "Use 4–15 digits."),
  ),
});

export const openingBalanceRule = /^-?\d{1,12}(\.\d{1,2})?$/;
