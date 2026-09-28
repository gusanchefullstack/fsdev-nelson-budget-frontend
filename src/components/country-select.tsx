import type { ComponentProps } from "react";
import { NativeSelect } from "@/components/native-select";
import { COUNTRIES, flagOf } from "@/lib/countries";

// Flag after the name keeps native type-to-search working; aria-label keeps it out of speech.
export function CountrySelect(props: Omit<ComponentProps<"select">, "children">) {
  return (
    <NativeSelect {...props}>
      <option value="">Choose a country</option>
      {COUNTRIES.map((c) => (
        <option key={c.code} value={c.code} aria-label={c.name}>
          {`${c.name} ${flagOf(c.code)}`}
        </option>
      ))}
    </NativeSelect>
  );
}
