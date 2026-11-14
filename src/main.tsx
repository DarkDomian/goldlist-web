import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./app/App";
import { SettingsProvider } from "./app/SettingsContext";
import { ServicesProvider } from "./services/ServicesContext";
import "./ui/styles.css";

const baseUrl = import.meta.env.BASE_URL;
const basename = baseUrl.replace(/\/$/, "") || "/";

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register(`${baseUrl}sw.js`);
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ServicesProvider>
      <SettingsProvider>
        <BrowserRouter basename={basename}>
          <App />
        </BrowserRouter>
      </SettingsProvider>
    </ServicesProvider>
  </StrictMode>,
);
