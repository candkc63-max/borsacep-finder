import { createRoot } from "react-dom/client";
import { StatusBar, Style } from "@capacitor/status-bar";
import { SplashScreen } from "@capacitor/splash-screen";
import { Capacitor } from "@capacitor/core";
import App from "./App.tsx";
import "./index.css";

if (Capacitor.isNativePlatform()) {
  StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
  StatusBar.setBackgroundColor({ color: "#09090b" }).catch(() => {});
  SplashScreen.hide().catch(() => {});
}

createRoot(document.getElementById("root")!).render(<App />);
