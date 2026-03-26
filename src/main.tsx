import './i18n';
import * as Sentry from '@sentry/react';
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

Sentry.init({
  dsn: "https://b0f77b62654df6d6961befbf75ae6c57@o4511111659388928.ingest.de.sentry.io/4511111675576400",
  sendDefaultPii: true,
  environment: import.meta.env.MODE,
});

createRoot(document.getElementById("root")!).render(<App />);
