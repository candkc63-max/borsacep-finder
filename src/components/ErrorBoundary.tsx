import React from "react";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, fontFamily: "monospace", color: "#fff", background: "#111" }}>
          <h1 style={{ color: "#ef4444" }}>Bir hata oluştu</h1>
          <p style={{ color: "#999", marginTop: 8 }}>Sayfa yüklenirken bir sorun meydana geldi.</p>
          <pre style={{ marginTop: 16, padding: 16, background: "#1a1a1a", borderRadius: 8, overflow: "auto", fontSize: 12, color: "#f97316" }}>
            {this.state.error?.message}
            {"\n\n"}
            {this.state.error?.stack}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: 16, padding: "8px 16px", background: "#22c55e", color: "#000", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: "bold" }}
          >
            Sayfayı Yenile
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
