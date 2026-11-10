import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { api } from "./api/client";
import { applyTheme } from "./pages/settings";
import "./index.css";

api
  .getSettings()
  .then((settings) => applyTheme(settings.theme))
  .catch(() => applyTheme("dark"));

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
