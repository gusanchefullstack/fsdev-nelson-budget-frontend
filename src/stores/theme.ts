import { create } from "zustand";

export type ThemePreference = "SYSTEM" | "LIGHT" | "DARK";
const STORAGE_KEY = "nelson.theme";

function readCached(): ThemePreference {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "LIGHT" || v === "DARK" ? v : "SYSTEM";
  } catch {
    return "SYSTEM";
  }
}

const media = () => window.matchMedia?.("(prefers-color-scheme: dark)");

function resolve(pref: ThemePreference): "light" | "dark" {
  if (pref === "SYSTEM") return media()?.matches ? "dark" : "light";
  return pref === "DARK" ? "dark" : "light";
}

function apply(pref: ThemePreference) {
  document.documentElement.classList.toggle("dark", resolve(pref) === "dark");
}

type ThemeState = {
  preference: ThemePreference;
  resolved: "light" | "dark";
  setPreference: (pref: ThemePreference) => void;
};

export const useThemeStore = create<ThemeState>((set) => ({
  preference: readCached(),
  resolved: resolve(readCached()),
  setPreference: (preference) => {
    try {
      localStorage.setItem(STORAGE_KEY, preference);
    } catch {
      // storage unavailable: keep the in-memory choice
    }
    apply(preference);
    set({ preference, resolved: resolve(preference) });
  },
}));

export const useResolvedTheme = () => useThemeStore((s) => s.resolved);

// Apply once at startup and follow the OS setting while on SYSTEM.
export function initTheme() {
  apply(useThemeStore.getState().preference);
  media()?.addEventListener("change", () => {
    const { preference } = useThemeStore.getState();
    if (preference === "SYSTEM") {
      apply(preference);
      useThemeStore.setState({ resolved: resolve(preference) });
    }
  });
}
