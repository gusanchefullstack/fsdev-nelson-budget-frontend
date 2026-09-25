import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields, usernameClient } from "better-auth/client/plugins";

// Same-origin: Vite (dev) and Vercel (prod) proxy /api/* to the backend.
export const authClient = createAuthClient({
  baseURL: typeof window === "undefined" ? "http://localhost:5173" : window.location.origin,
  basePath: "/api/auth",
  plugins: [
    usernameClient(),
    inferAdditionalFields({
      user: {
        firstName: { type: "string" },
        lastName: { type: "string" },
        address: { type: "string" },
        city: { type: "string" },
        postalCode: { type: "string" },
        state: { type: "string" },
        country: { type: "string" },
        phoneCountryCode: { type: "string" },
        phoneNumber: { type: "string" },
        timezone: { type: "string" },
        themePreference: { type: "string", required: false, input: false },
        onboardingStatus: { type: "string", required: false, input: false },
      },
    }),
  ],
});

export type SessionUser = NonNullable<ReturnType<typeof authClient.useSession>["data"]>["user"];
