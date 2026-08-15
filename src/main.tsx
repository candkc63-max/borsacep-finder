import { createRoot } from "react-dom/client";
import "./index.css";

const root = createRoot(document.getElementById("root")!);

import("./App.tsx")
  .then(async ({ default: App }) => {
    let Analytics: React.ComponentType | null = null;
    try {
      const mod = await import("@vercel/analytics/react");
      Analytics = mod.Analytics;
    } catch {}
    root.render(
      <>
        <App />
        {Analytics && <Analytics />}
      </>
    );
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
