"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import TurnstileChallenge from "@/components/TurnstileChallenge";

const ALLOWED_RETURN_HOSTS = new Set([
  "loadlink-control-centre.vercel.app",
  "adlink-control-centre.vercel.app",
]);

function safeReturnUrl(raw: string | null) {
  try {
    const parsed = new URL(raw || "https://loadlink-control-centre.vercel.app/");
    if (parsed.protocol !== "https:" || !ALLOWED_RETURN_HOSTS.has(parsed.hostname)) {
      return "https://loadlink-control-centre.vercel.app/";
    }
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return "https://loadlink-control-centre.vercel.app/";
  }
}

export default function ControlCaptchaPage() {
  const [message, setMessage] = useState("Complete the security check to return to LoadLink Control.");
  const [resetKey, setResetKey] = useState(0);
  const [failed, setFailed] = useState(false);
  const [autoRetrying, setAutoRetrying] = useState(false);
  const automaticRetryUsed = useRef(false);

  const returnUrl = useMemo(() => {
    if (typeof window === "undefined") return "https://loadlink-control-centre.vercel.app/";
    return safeReturnUrl(new URLSearchParams(window.location.search).get("return"));
  }, []);

  const retryVerification = useCallback((automatic = false) => {
    setFailed(false);
    setAutoRetrying(automatic);
    setMessage(automatic ? "Cloudflare did not complete the check. Retrying securely…" : "Security check reset. Try again.");
    setResetKey((value) => value + 1);
    window.setTimeout(() => setAutoRetrying(false), 1200);
  }, []);

  const handleFailure = useCallback(() => {
    if (!automaticRetryUsed.current) {
      automaticRetryUsed.current = true;
      retryVerification(true);
      return;
    }

    setAutoRetrying(false);
    setFailed(true);
    setMessage("Cloudflare could not verify this connection. Reset the security check and try again.");
  }, [retryVerification]);

  const receiveToken = useCallback((token: string) => {
    if (!token) return;

    setFailed(false);
    setMessage("Verified. Returning to LoadLink Control…");
    const destination = new URL(returnUrl);
    destination.searchParams.set("captcha_token", token);
    window.location.replace(destination.toString());
  }, [returnUrl]);

  function returnToControlCentre() {
    const destination = new URL(returnUrl);
    destination.searchParams.set("auth_error", "Security verification was not completed. Please try the security check again.");
    window.location.replace(destination.toString());
  }

  return (
    <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", background: "#090d0f", color: "#fff", padding: 24, fontFamily: "Arial, sans-serif" }}>
      <section style={{ width: "min(460px, 100%)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 24, padding: 28, background: "#0d1215" }}>
        <div style={{ height: 6, width: 96, borderRadius: 999, background: "#f6b800", marginBottom: 24 }} />
        <h1 style={{ margin: 0, fontSize: 30, lineHeight: 1.1 }}>LoadLink security check</h1>
        <p style={{ margin: "14px 0 22px", color: "rgba(255,255,255,.68)", lineHeight: 1.6 }}>{message}</p>

        <TurnstileChallenge
          onToken={receiveToken}
          onFailure={handleFailure}
          resetKey={resetKey}
          darkMode
        />

        {autoRetrying ? (
          <div role="status" style={{ marginTop: 16, color: "rgba(255,255,255,.72)", fontSize: 14 }}>
            Resetting security verification…
          </div>
        ) : null}

        {failed ? (
          <div style={{ display: "grid", gap: 10, marginTop: 18 }}>
            <button
              type="button"
              onClick={() => retryVerification(false)}
              style={{ minHeight: 52, border: "1px solid #f6b800", borderRadius: 14, background: "#f6b800", color: "#080a0b", fontWeight: 800, fontSize: 16 }}
            >
              Reset and try again
            </button>
            <button
              type="button"
              onClick={returnToControlCentre}
              style={{ minHeight: 48, border: "1px solid rgba(255,255,255,.16)", borderRadius: 14, background: "transparent", color: "#fff", fontWeight: 700 }}
            >
              Return to Control Centre
            </button>
            <small style={{ color: "rgba(255,255,255,.5)", lineHeight: 1.5 }}>
              If verification keeps failing, switch between Wi-Fi and mobile data, then reset the check again.
            </small>
          </div>
        ) : null}
      </section>
    </main>
  );
}
