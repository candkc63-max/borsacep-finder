import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Capacitor plugins - only load on native platforms
async function initNative() {
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (Capacitor.isNativePlatform()) {
      const { StatusBar, Style } = await import("@capacitor/status-bar");
      const { SplashScreen } = await import("@capacitor/splash-screen");
      StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
      StatusBar.setBackgroundColor({ color: "#09090b" }).catch(() => {});
      SplashScreen.hide().catch(() => {});
    }
  } catch {}
}

initNative();
createRoot(document.getElementById("root")!).render(<App />);
