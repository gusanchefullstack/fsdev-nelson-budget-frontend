import type { ComponentProps } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { flagOf } from "@/lib/countries";

/** Phone country code input showing the flag of the chosen country (decorative). */
export function PhoneCodeInput({
  country,
  className,
  ...props
}: ComponentProps<typeof Input> & { country?: string }) {
  return (
    <div className="relative">
      {country && (
        <span
          aria-hidden="true"
          data-testid="phone-code-flag"
          className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center leading-none"
        >
          {flagOf(country)}
        </span>
      )}
      <Input {...props} className={cn(country && "pl-9", className)} />
    </div>
  );
}
