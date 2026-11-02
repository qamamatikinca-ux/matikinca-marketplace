import { safeNextPath } from "@/lib/auth";
import { supabase } from "@/lib/supabaseClient";

/** One consistent OAuth entry for Login and Sign up.
 * Browser Supabase uses PKCE; the callback URL must be in Supabase's redirect allow list.
 */
export async function beginLoadLinkGoogleSignIn(nextPath: string) {
  if (typeof window === "undefined") throw new Error("Google login must start in the browser.");
  const callback = new URL("/auth/callback", window.location.origin);
  callback.searchParams.set("next", safeNextPath(nextPath, "/"));
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: callback.toString() },
  });
  if (error) throw error;
  if (!data.url) throw new Error("Google did not return an authorisation link.");
}
