import type { ComponentProps } from "react";
import { NativeSelect } from "@/components/native-select";
import { COUNTRIES } from "@/lib/countries";

export function CountrySelect(props: Omit<ComponentProps<"select">, "children">) {
  return (
    <NativeSelect {...props}>
      <option value="">Choose a country</option>
      {COUNTRIES.map((c) => (
        <option key={c.code} value={c.code}>
          {c.name}
        </option>
      ))}
    </NativeSelect>
  );
}
