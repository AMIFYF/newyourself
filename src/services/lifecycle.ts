import { App } from "@capacitor/app";
import { isNative } from "./persistence";
import { store } from "./storage";
export function watchLifecycle(onResume: () => void): () => void {
  const resume = () => {
    onResume();
    void store.initialize();
  };
  const visibility = () => {
    if (!document.hidden) resume();
    else void store.flush();
  };
  window.addEventListener("focus", resume);
  document.addEventListener("visibilitychange", visibility);
  const nativeListener = isNative
    ? App.addListener("appStateChange", ({ isActive }) => {
        if (isActive) resume();
        else void store.flush();
      })
    : null;
  return () => {
    window.removeEventListener("focus", resume);
    document.removeEventListener("visibilitychange", visibility);
    if (nativeListener) void nativeListener.then((handle) => handle.remove());
  };
}
