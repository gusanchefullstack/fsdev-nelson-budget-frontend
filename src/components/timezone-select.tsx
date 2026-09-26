import type { ComponentProps } from "react";
import { NativeSelect } from "@/components/native-select";

// Grouped by region; native selects support type-to-search with the keyboard.
const zones = Intl.supportedValuesOf("timeZone");
const groups = zones.reduce<Record<string, string[]>>((acc, tz) => {
  const region = tz.includes("/") ? tz.split("/")[0]! : "Other";
  (acc[region] ??= []).push(tz);
  return acc;
}, {});

export function TimezoneSelect(props: Omit<ComponentProps<"select">, "children">) {
  return (
    <NativeSelect {...props}>
      <option value="">Choose a timezone</option>
      {Object.entries(groups).map(([region, list]) => (
        <optgroup key={region} label={region}>
          {list.map((tz) => (
            <option key={tz} value={tz}>
              {tz.replaceAll("_", " ")}
            </option>
          ))}
        </optgroup>
      ))}
    </NativeSelect>
  );
}
