import { createRoot } from "react-dom/client";
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

const root = createRoot(document.getElementById("root")!);

import("./App.tsx")
  .then(({ default: App }) => {
    root.render(<App />);
  })
  .catch(() => {
    root.render(
      <div style={{ padding: 40, fontFamily: "monospace", color: "#fff", background: "#0f1118", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <h1 style={{ color: "#ef4444", marginBottom: 16 }}>Uygulama Başlatılamadı</h1>
        <p style={{ color: "#999", maxWidth: 500, textAlign: "center", lineHeight: 1.6 }}>
          Beklenmeyen bir hata oluştu. Lütfen sayfayı yenileyin.
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{ marginTop: 24, padding: "10px 24px", background: "#22c55e", color: "#000", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: "bold", fontSize: 14 }}
        >
          Sayfayı Yenile
        </button>
      </div>
    );
  });
