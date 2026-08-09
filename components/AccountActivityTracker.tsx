"use client";

import { useEffect } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";

const DEVICE_KEY = "loadlink-device-id-v1";

function getDeviceId() {
  try {
    let value = window.localStorage.getItem(DEVICE_KEY);
    if (!value) {
      value = crypto.randomUUID();
      window.localStorage.setItem(DEVICE_KEY, value);
    }
    return value;
  } catch {
    return crypto.randomUUID();
  }
}

function describeClient() {
  const ua = navigator.userAgent || "Unknown browser";
  const platform = navigator.platform || "Unknown device";
  const browser = /Edg\//.test(ua) ? "Microsoft Edge"
    : /CriOS|Chrome\//.test(ua) ? "Chrome"
    : /FxiOS|Firefox\//.test(ua) ? "Firefox"
    : /Safari\//.test(ua) ? "Safari"
    : "Web browser";
  const device = /iPad/.test(ua) ? "iPad"
    : /iPhone/.test(ua) ? "iPhone"
    : /Android/.test(ua) ? "Android device"
    : /Mac/.test(platform) ? "Mac"
    : /Win/.test(platform) ? "Windows device"
    : /Linux/.test(platform) ? "Linux device"
    : "Device";
  return { browser, platform, label: `${browser} on ${device}`, userAgent: ua.slice(0, 500) };
}

export default function AccountActivityTracker(): null {
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let disposed = false;
    let timer: number | null = null;

    const sync = async (recordLogin = false): Promise<void> => {
      if (disposed) return;
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user || user.is_anonymous) return;

      const deviceId = getDeviceId();
      const client = describeClient();
      await supabase.from("loadlink_account_devices").upsert({
        user_id: user.id,
        device_id: deviceId,
        label: client.label,
        browser: client.browser,
        platform: client.platform,
        user_agent: client.userAgent,
        last_seen: new Date().toISOString(),
      }, { onConflict: "user_id,device_id" });

      const loginKey = `loadlink-login-event:${user.id}:${deviceId}`;
      if (recordLogin && !window.sessionStorage.getItem(loginKey)) {
        window.sessionStorage.setItem(loginKey, "1");
        await supabase.from("user_activity_events").insert({
          user_id: user.id,
          activity_type: "login",
          entity_type: "account",
          entity_id: deviceId,
          metadata: { device_id: deviceId, label: client.label, browser: client.browser, platform: client.platform },
        });
      }
    };

    void sync(true);
    timer = window.setInterval(() => { void sync(false); }, 5 * 60 * 1000);
    const onFocus = (): void => { void sync(false); };
    window.addEventListener("focus", onFocus);
    const { data: authListener } = supabase.auth.onAuthStateChange((event: string) => {
      if (event === "SIGNED_IN") window.setTimeout(() => { void sync(true); }, 0);
    });

    return () => {
      disposed = true;
      if (timer) window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      authListener.subscription.unsubscribe();
    };
  }, []);
  return null;
}
