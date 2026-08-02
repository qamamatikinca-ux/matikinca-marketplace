"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import LoadLinkLogo from "@/components/LoadLinkLogo";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";

type NdaRecord = {
  id: string;
  version: string;
  title: string;
  summary: string;
  agreementText: string;
  effectiveAt: string;
  sha256: string;
};

type AccessState = {
  authenticated: boolean;
  allowed: boolean;
  isAdmin: boolean;
  status: "active" | "flagged" | "suspended" | "blocked" | string;
  reason?: string | null;
  suspendedUntil?: string | null;
  requiresAcceptance: boolean;
  ndaAccepted: boolean;
  nda: NdaRecord | null;
};

const AUTH_ROUTES = ["/login", "/signup", "/forgot-password", "/auth/callback"];

function isAuthRoute(pathname: string) {
  return AUTH_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

async function responseJson<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof payload?.error === "string" ? payload.error : "LoadLink could not verify access.";
    throw new Error(message);
  }
  return payload as T;
}

export default function LoadLinkAccessBoundary({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const [access, setAccess] = useState<AccessState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [acceptedName, setAcceptedName] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [declined, setDeclined] = useState(false);

  const exempt = isAuthRoute(pathname);
  const nextPath = useMemo(() => encodeURIComponent(pathname || "/"), [pathname]);

  const loadAccess = useCallback(async () => {
    if (exempt) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      if (!isSupabaseConfigured) throw new Error("Supabase is not connected, so protected access cannot be verified.");

      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      const response = await fetch("/api/access/nda", {
        method: "GET",
        cache: "no-store",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const result = await responseJson<AccessState>(response);
      setAccess(result);
      setDeclined(false);

      if (result.authenticated) {
        const { data: userData } = await supabase.auth.getUser();
        const user = userData.user;
        const name = String(user?.user_metadata?.full_name || user?.user_metadata?.name || "").trim();
        if (name) setAcceptedName((current) => current || name);
      }
    } catch (loadError) {
      setAccess(null);
      setError(loadError instanceof Error ? loadError.message : "LoadLink could not verify access.");
    } finally {
      setLoading(false);
    }
  }, [exempt]);

  useEffect(() => {
    void loadAccess();
  }, [loadAccess, pathname]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      if (!exempt) window.setTimeout(() => void loadAccess(), 0);
    });
    return () => subscription.unsubscribe();
  }, [exempt, loadAccess]);

  useEffect(() => {
    if (exempt || access?.allowed) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [access?.allowed, exempt]);

  async function acceptAgreement() {
    if (!access?.authenticated) {
      router.push(`/login?next=${nextPath}`);
      return;
    }
    if (!confirmed || acceptedName.trim().length < 2 || busy) return;

    setBusy(true);
    setError("");
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Your sign-in session expired. Sign in again to accept the agreement.");
      const response = await fetch("/api/access/nda", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "accept", acceptedName: acceptedName.trim() }),
      });
      const result = await responseJson<AccessState>(response);
      setAccess(result);
      setConfirmed(false);
      window.dispatchEvent(new Event("loadlink-access-state-changed"));
    } catch (acceptError) {
      setError(acceptError instanceof Error ? acceptError.message : "The agreement could not be accepted.");
    } finally {
      setBusy(false);
    }
  }

  async function declineAgreement() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (token) {
        await fetch("/api/access/nda", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ action: "decline" }),
        }).catch(() => undefined);
        await supabase.auth.signOut();
      }
      setDeclined(true);
      setAccess((current) => current ? { ...current, authenticated: false, allowed: false, ndaAccepted: false } : current);
    } finally {
      setBusy(false);
    }
  }

  async function signOutBlockedAccount() {
    setBusy(true);
    try {
      await supabase.auth.signOut();
      router.replace("/login");
    } finally {
      setBusy(false);
    }
  }

  if (exempt) return <>{children}</>;
  if (loading) return <AccessLoading />;
  if (access?.allowed) return <>{children}</>;

  if (declined) {
    return (
      <AccessShell>
        <div className="mx-auto max-w-xl text-center">
          <StatusIcon>×</StatusIcon>
          <p className="mt-6 text-xs font-black uppercase tracking-[0.22em] text-[#f6b800]">Access declined</p>
          <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] text-white">LoadLink cannot be used without acceptance</h1>
          <p className="mt-4 text-sm leading-7 text-white/65">
            You declined the LoadLink Confidentiality and Restricted-Use Agreement. No marketplace, posting, messaging or Control Centre access will be provided unless you sign in and accept the current agreement.
          </p>
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={() => { setDeclined(false); void loadAccess(); }} className="h-12 border border-white/20 bg-white/5 px-5 text-xs font-black uppercase tracking-[0.14em] text-white">Review again</button>
            <Link href={`/login?next=${nextPath}`} className="flex h-12 items-center justify-center bg-[#f6b800] px-5 text-xs font-black uppercase tracking-[0.14em] text-black">Sign in</Link>
          </div>
        </div>
      </AccessShell>
    );
  }

  if (access?.status === "blocked" || access?.status === "suspended") {
    const suspended = access.status === "suspended";
    return (
      <AccessShell>
        <div className="mx-auto max-w-xl text-center">
          <StatusIcon>!</StatusIcon>
          <p className="mt-6 text-xs font-black uppercase tracking-[0.22em] text-red-400">Account access restricted</p>
          <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] text-white">{suspended ? "Your LoadLink account is suspended" : "Your LoadLink account is blocked"}</h1>
          <p className="mt-4 text-sm leading-7 text-white/65">
            {access.reason || "This account cannot access LoadLink because it has been restricted by the Control Centre."}
          </p>
          {suspended && access.suspendedUntil ? <p className="mt-3 text-xs font-bold text-[#f6b800]">Scheduled review: {new Date(access.suspendedUntil).toLocaleString("en-ZA")}</p> : null}
          <p className="mt-5 border border-red-400/30 bg-red-400/10 p-4 text-left text-xs leading-6 text-red-100">
            Attempting to bypass a restriction by using another account, false details, shared credentials or technical workarounds is prohibited and may result in further action.
          </p>
          <button type="button" onClick={() => void signOutBlockedAccount()} disabled={busy} className="mt-7 h-12 w-full bg-white px-5 text-xs font-black uppercase tracking-[0.14em] text-black disabled:opacity-50">{busy ? "Signing out…" : "Sign out"}</button>
          <a href="mailto:loadlinksouthafrica@gmail.com" className="mt-4 inline-block text-xs font-black text-[#f6b800] underline underline-offset-4">Contact LoadLink support</a>
        </div>
      </AccessShell>
    );
  }

  return (
    <AccessShell>
      <div className="mx-auto w-full max-w-3xl">
        <div className="text-center">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#f6b800]">Required before access</p>
          <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] text-white md:text-4xl">{access?.nda?.title || "LoadLink Confidentiality Agreement"}</h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-white/65">
            {access?.nda?.summary || "Review and accept the current agreement before entering the LoadLink platform."}
          </p>
        </div>

        <div className="mt-7 border border-[#f6b800]/35 bg-[#080808]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-white">Agreement version {access?.nda?.version || "current"}</p>
              <p className="mt-1 text-[11px] text-white/45">Effective {formatDate(access?.nda?.effectiveAt)}</p>
            </div>
            <span className="border border-[#f6b800]/40 bg-[#f6b800]/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-[#f6b800]">Electronic acceptance recorded</span>
          </div>
          <div className="max-h-[42vh] overflow-y-auto whitespace-pre-wrap px-5 py-5 text-sm leading-7 text-white/75 md:px-7">
            {access?.nda?.agreementText || "The current agreement could not be loaded."}
          </div>
        </div>

        {!access?.authenticated ? (
          <div className="mt-6 border border-white/10 bg-white/[0.04] p-5">
            <p className="text-sm font-black text-white">Sign in to accept and continue</p>
            <p className="mt-2 text-xs leading-6 text-white/55">Acceptance is linked to your account so it cannot be bypassed by clearing browser data or changing devices.</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <Link href={`/login?next=${nextPath}`} className="flex h-12 items-center justify-center bg-[#f6b800] px-4 text-xs font-black uppercase tracking-[0.12em] text-black sm:col-span-2">Sign in to accept</Link>
              <button type="button" onClick={() => void declineAgreement()} className="h-12 border border-white/20 px-4 text-xs font-black uppercase tracking-[0.12em] text-white">Decline</button>
            </div>
            <p className="mt-4 text-center text-xs text-white/45">No account? <Link href={`/signup?next=${nextPath}`} className="font-black text-[#f6b800]">Create one</Link></p>
          </div>
        ) : (
          <div className="mt-6 border border-white/10 bg-white/[0.04] p-5">
            <label className="block text-xs font-black uppercase tracking-[0.12em] text-white/70">
              Full legal name
              <input value={acceptedName} onChange={(event) => setAcceptedName(event.target.value)} autoComplete="name" className="mt-2 h-12 w-full border border-white/15 bg-black px-4 text-sm font-semibold normal-case tracking-normal text-white outline-none focus:border-[#f6b800]" placeholder="Enter your full name" />
            </label>
            <label className="mt-4 flex items-start gap-3 border border-white/10 bg-black/40 p-4 text-sm leading-6 text-white/75">
              <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-1 h-4 w-4 accent-[#f6b800]" />
              <span>I have read and understood this agreement. I agree to be legally bound by it and to use LoadLink only for authorised logistics purposes.</span>
            </label>
            {error ? <p role="alert" className="mt-4 border border-red-400/30 bg-red-400/10 p-3 text-xs font-bold text-red-100">{error}</p> : null}
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <button type="button" onClick={() => void acceptAgreement()} disabled={!confirmed || acceptedName.trim().length < 2 || busy} className="h-12 bg-[#f6b800] px-4 text-xs font-black uppercase tracking-[0.12em] text-black disabled:cursor-not-allowed disabled:opacity-40 sm:col-span-2">{busy ? "Recording acceptance…" : "Accept and enter LoadLink"}</button>
              <button type="button" onClick={() => void declineAgreement()} disabled={busy} className="h-12 border border-white/20 px-4 text-xs font-black uppercase tracking-[0.12em] text-white disabled:opacity-40">Decline</button>
            </div>
          </div>
        )}

        {error && !access?.authenticated ? <p role="alert" className="mt-4 border border-red-400/30 bg-red-400/10 p-3 text-xs font-bold text-red-100">{error}</p> : null}
      </div>
    </AccessShell>
  );
}

function AccessShell({ children }: { children: ReactNode }) {
  return (
    <main className="fixed inset-0 z-[10000] overflow-y-auto bg-black px-5 py-7 text-white">
      <div className="mx-auto mb-7 flex max-w-5xl items-center justify-center border-b border-white/10 pb-6">
        <LoadLinkLogo theme="dark" showGlow className="h-auto max-h-12 w-auto max-w-[220px]" />
      </div>
      {children}
      <footer className="mx-auto mt-8 max-w-3xl border-t border-white/10 pt-5 text-center text-[11px] leading-5 text-white/40">
        LoadLink South Africa · loadlinksouthafrica@gmail.com · Access is subject to the current confidentiality, privacy and platform-use rules.
      </footer>
    </main>
  );
}

function AccessLoading() {
  return (
    <main className="fixed inset-0 z-[10000] flex items-center justify-center bg-black px-5 text-white">
      <div className="text-center">
        <LoadLinkLogo theme="dark" showGlow className="h-auto max-h-12 w-auto max-w-[220px]" />
        <div className="mx-auto mt-8 h-10 w-10 animate-spin rounded-full border-2 border-white/15 border-t-[#f6b800]" />
        <p className="mt-4 text-xs font-black uppercase tracking-[0.16em] text-white/55">Verifying protected access</p>
      </div>
    </main>
  );
}

function StatusIcon({ children }: { children: ReactNode }) {
  return <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[#f6b800]/50 bg-[#f6b800]/10 text-2xl font-black text-[#f6b800]">{children}</div>;
}

function formatDate(value?: string | null) {
  if (!value) return "immediately";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" });
}
