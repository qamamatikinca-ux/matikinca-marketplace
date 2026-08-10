"use client";

import { useMemo, useState } from "react";
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
  const returnUrl = useMemo(() => {
    if (typeof window === "undefined") return "https://loadlink-control-centre.vercel.app/";
    return safeReturnUrl(new URLSearchParams(window.location.search).get("return"));
  }, []);

  function receiveToken(token: string) {
    if (!token) {
      setMessage("Security verification could not be completed. Try again.");
      setResetKey((value) => value + 1);
      return;
    }
    setMessage("Verified. Returning to LoadLink Control…");
    const destination = new URL(returnUrl);
    destination.searchParams.set("captcha_token", token);
    window.location.replace(destination.toString());
  }

  return (
    <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", background: "#090d0f", color: "#fff", padding: 24, fontFamily: "Arial, sans-serif" }}>
      <section style={{ width: "min(460px, 100%)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 24, padding: 28, background: "#0d1215" }}>
        <div style={{ height: 6, width: 96, borderRadius: 999, background: "#f6b800", marginBottom: 24 }} />
        <h1 style={{ margin: 0, fontSize: 30, lineHeight: 1.1 }}>LoadLink security check</h1>
        <p style={{ margin: "14px 0 22px", color: "rgba(255,255,255,.68)", lineHeight: 1.6 }}>{message}</p>
        <TurnstileChallenge onToken={receiveToken} resetKey={resetKey} darkMode />
      </section>
    </main>
  );
}
