import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { useThemeStore, type ThemePreference } from "@/stores/theme";

const OPTIONS: { value: ThemePreference; label: string; Icon: typeof SunIcon }[] = [
  { value: "LIGHT", label: "Light theme", Icon: SunIcon },
  { value: "DARK", label: "Dark theme", Icon: MoonIcon },
  { value: "SYSTEM", label: "Device theme", Icon: MonitorIcon },
];

export function ThemeToggle({ onChange }: { onChange?: (pref: ThemePreference) => void }) {
  const { preference, setPreference } = useThemeStore();
  return (
    <div role="radiogroup" aria-label="Theme" className="inline-flex rounded-md border">
      {OPTIONS.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={preference === value}
          aria-label={label}
          title={label}
          onClick={() => {
            setPreference(value);
            onChange?.(value);
          }}
          className="grid size-9 place-items-center first:rounded-l-md last:rounded-r-md aria-checked:bg-primary aria-checked:text-primary-foreground"
        >
          <Icon className="size-4" aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}
