import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";
import { parseData } from "./validation";

export const STORAGE_KEY = "daily-feedback-v1";
export const isNative = Capacitor.isNativePlatform();

// Keep the web storage key unchanged; use Android SharedPreferences in the app.
export const persistence = {
  async read(): Promise<string | null> {
    if (!isNative) return localStorage.getItem(STORAGE_KEY);
    const { value } = await Preferences.get({ key: STORAGE_KEY });
    if (value !== null) return value;
    const legacy = localStorage.getItem(STORAGE_KEY);
    if (legacy !== null) {
      parseData(legacy); // Never silently migrate malformed legacy state.
      await Preferences.set({ key: STORAGE_KEY, value: legacy });
    }
    return legacy;
  },
  async write(value: string): Promise<void> {
    if (isNative) await Preferences.set({ key: STORAGE_KEY, value });
    else localStorage.setItem(STORAGE_KEY, value);
  },
};
