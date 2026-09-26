import { z } from "zod";

// Mirrors the backend rules (data-model.md, FR-001)
const person = z.string().trim().min(1, "Required.").max(60, "Use 60 characters or fewer.");
const text = (max: number) => z.string().trim().min(1, "Required.").max(max);

export const profileFields = {
  firstName: person,
  lastName: person,
  address: text(200),
  city: text(100),
  postalCode: text(20),
  state: text(100),
  country: z.string().regex(/^[A-Z]{2}$/, "Choose a country."),
  phoneCountryCode: z
    .string()
    .trim()
    .regex(/^\+\d{1,3}$/, "Use + and 1–3 digits, e.g. +1."),
  phoneNumber: z
    .string()
    .trim()
    .regex(/^\d{4,15}$/, "Use 4–15 digits, no spaces."),
  timezone: z.string().min(1, "Choose a timezone."),
};

export const signUpSchema = z.object({
  ...profileFields,
  username: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9_.]{3,30}$/, "Use 3–30 letters, numbers, underscores or dots."),
  email: z.email("Enter a valid email."),
  password: z.string().min(8, "Use at least 8 characters."),
});

export const profileSchema = z.object(profileFields);

export const signInSchema = z.object({
  identifier: z.string().trim().min(1, "Enter your email or username."),
  password: z.string().min(1, "Enter your password."),
});

export const passwordSchema = z.object({
  password: z.string().min(8, "Use at least 8 characters."),
});
export const emailSchema = z.object({ email: z.email("Enter a valid email.") });
