"use client";

import { useEffect } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";

type GoogleCredentialResponse = { credential?: string };
type GoogleIdentity = {
  initialize: (options: {
    client_id: string; nonce: string; callback: (response: GoogleCredentialResponse) => void;
    context?: "signin" | "signup" | "use"; auto_select?: boolean;
    use_fedcm_for_prompt?: boolean; itp_support?: boolean;
  }) => void;
  prompt: () => void;
  cancel: () => void;
};
type GoogleWindow = Window & { google?: { accounts?: { id?: GoogleIdentity } } };

const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim();

export default function GoogleOneTap() {
  useEffect(() => {
    // Only Google's official SDK may render this consent window. Never imitate the Google popup.
    if (!clientId || !isSupabaseConfigured || !clientId.endsWith(".apps.googleusercontent.com")) return;
    let active = true;
    let identity: GoogleIdentity | undefined;
    let script: HTMLScriptElement | null = null;

    const initialize = async () => {
      if (!active) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (!active || session?.user) return;

      const random = new Uint8Array(32);
      crypto.getRandomValues(random);
      const nonce = btoa(String.fromCharCode(...random));
      const buffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(nonce));
      const hashedNonce = Array.from(new Uint8Array(buffer)).map((byte) => byte.toString(16).padStart(2, "0")).join("");

      if (!active) return;
      const google = (window as GoogleWindow).google?.accounts?.id;
      if (!google) return;
      identity = google;

      google.initialize({
        client_id: clientId,
        nonce: hashedNonce,
        context: "signin",
        auto_select: false,
        use_fedcm_for_prompt: true,
        itp_support: true,
        callback: async ({ credential }) => {
          if (!active || !credential) return;
          const result = await supabase.auth.signInWithIdToken({ provider: "google", token: credential, nonce });
          if (!result.error && active) window.location.reload();
        },
      });
      google.prompt();
    };

    if ((window as GoogleWindow).google?.accounts?.id) {
      void initialize();
    } else {
      const existing = document.querySelector<HTMLScriptElement>('script[src="https://accounts.google.com/gsi/client"]');
      if (existing) {
        script = existing;
        script.addEventListener("load", initialize);
      } else {
        script = document.createElement("script");
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.defer = true;
        script.addEventListener("load", initialize);
        document.head.appendChild(script);
      }
    }

    return () => {
      active = false;
      script?.removeEventListener("load", initialize);
      identity?.cancel();
    };
  }, []);

  return null;
}
