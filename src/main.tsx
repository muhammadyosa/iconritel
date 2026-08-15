import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Auto-update PWA: detect new service worker and reload immediately
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    window.location.reload();
  });

  const checkUpdate = async () => {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.update();
        // Activate a waiting worker right away (no manual cache clear needed)
        registration.waiting?.postMessage({ type: "SKIP_WAITING" });
      }
    } catch {
      /* offline or unsupported */
    }
  };

  // Check on load, on tab focus, on reconnect, and every 60 seconds
  checkUpdate();
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") checkUpdate();
  });
  window.addEventListener("online", checkUpdate);
  setInterval(checkUpdate, 60 * 1000);
}


createRoot(document.getElementById("root")!).render(<App />);
