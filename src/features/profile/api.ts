import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type One } from "@/lib/api";
import type { ThemePreference } from "@/stores/theme";

export type Profile = {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  postalCode: string;
  state: string;
  country: string;
  phoneCountryCode: string;
  phoneNumber: string;
  timezone: string;
  themePreference: ThemePreference;
  onboardingStatus: "PENDING" | "COMPLETED" | "SKIPPED";
};

export const profileQuery = queryOptions({
  queryKey: ["me"],
  queryFn: () => api<One<Profile>>("/me").then((r) => r.data),
});

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Profile>) =>
      api<One<Profile>>("/me", { method: "PATCH", body }).then((r) => r.data),
    onSuccess: (profile) => {
      queryClient.setQueryData(profileQuery.queryKey, profile);
      void queryClient.invalidateQueries({ queryKey: ["session"] });
    },
  });
}
