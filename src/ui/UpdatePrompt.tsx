import { useEffect, useState } from "react";

export function UpdatePrompt() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (!import.meta.env.PROD || typeof navigator === "undefined" || !navigator.serviceWorker) {
      return;
    }

    let active = true;
    let refreshing = false;
    const onControllerChange = () => {
      if (refreshing) {
        return;
      }
      refreshing = true;
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    void navigator.serviceWorker.getRegistration().then((registration) => {
      if (!active || !registration) {
        return;
      }

      const inspect = () => {
        if (registration.waiting && navigator.serviceWorker.controller) {
          setWaitingWorker(registration.waiting);
        }
      };

      inspect();
      registration.addEventListener("updatefound", () => {
        const installing = registration.installing;
        installing?.addEventListener("statechange", () => {
          if (installing.state === "installed" && navigator.serviceWorker.controller) {
            setWaitingWorker(installing);
          }
        });
      });
    });

    return () => {
      active = false;
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  if (!waitingWorker) {
    return null;
  }

  return (
    <div className="update-banner" role="status">
      <span>A new version is ready.</span>
      <button
        type="button"
        className="button button--small button--primary"
        onClick={() => {
          waitingWorker.postMessage({ type: "SKIP_WAITING" });
        }}
      >
        Reload
      </button>
    </div>
  );
}
