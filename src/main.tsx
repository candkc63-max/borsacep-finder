import { createRoot } from "react-dom/client";
import { installGoogleAnalyticsPageViews } from "./analytics/googleAnalytics";
import App from "./App.tsx";
import "./index.css";

installGoogleAnalyticsPageViews();

createRoot(document.getElementById("root")!).render(<App />);
