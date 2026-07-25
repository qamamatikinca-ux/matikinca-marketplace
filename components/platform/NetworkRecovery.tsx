"use client";

import { useEffect, useState } from "react";

export default function NetworkRecovery() {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); };
  }, []);

  if (!offline) return null;
  return (
    <div role="status" aria-live="polite" className="loadlink-network-banner">
      You are offline. LoadLink will reconnect automatically when your connection returns.
    </div>
  );
}
