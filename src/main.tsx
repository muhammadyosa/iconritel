import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Auto-update PWA: detect new service worker and reload immediately
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    window.location.reload();
  });

  // Check for updates every 5 minutes (reduced from 60s to save CPU/battery on mobile)
  setInterval(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      await registration.update();
    }
  }, 5 * 60 * 1000);
}

createRoot(document.getElementById("root")!).render(<App />);
