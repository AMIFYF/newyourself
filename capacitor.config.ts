import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.dailyfeedback.app",
  appName: "每日正反馈",
  webDir: "dist",
  android: { backgroundColor: "#f5f5f0" },
  plugins: {
    SystemBars: {
      style: "LIGHT",
      insetsHandling: "css",
      initialViewportFitValueHint: "cover",
    },
  },
};

export default config;
