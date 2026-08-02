"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";

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
  status: "active" | "flagged" | "suspended" | "blocked" | "guest" | "verification-error" | string;
  reason?: string | null;
  suspendedUntil?: string | null;
  requiresAcceptance: boolean;
  ndaAccepted: boolean;
  nda: NdaRecord | null;
};

const AUTH_ROUTES = ["/login", "/signup", "/forgot-password", "/auth/callback"];
const FALLBACK_NDA_VERSION = "2026-08-02.1";
const LOCAL_ACCEPTANCE_KEY = `loadlink-nda-accepted:${FALLBACK_NDA_VERSION}`;

const FALLBACK_NDA: NdaRecord = {
  id: "loadlink-default-nda",
  version: FALLBACK_NDA_VERSION,
  title: "LoadLink Confidentiality and Restricted-Use Agreement",
  summary: "LoadLink information and platform content may be used only for genuine activity on the LoadLink logistics platform.",
  effectiveAt: "2026-08-02T00:00:00+02:00",
  sha256: "local-fallback-version-2026-08-02-1",
  agreementText: `LOADLINK CONFIDENTIALITY AND RESTRICTED-USE AGREEMENT

Effective date: 2 August 2026
Contact: loadlinksouthafrica@gmail.com

1. AGREEMENT
By clicking “Enter LoadLink”, you confirm that you have read, understood and agreed to this Confidentiality and Restricted-Use Agreement.

2. AUTHORISED USE
You may use LoadLink only for genuine logistics, vehicle, driver, dealership, job, contract, communication or marketplace activity permitted by the platform.

3. CONFIDENTIAL AND PROTECTED INFORMATION
Protected information includes non-public listings, contacts, messages, documents, verification information, prices, routes, job and contract details, user information, business methods, designs, workflows, analytics, software, source code, databases, security controls and Control Centre information.

4. NO COPYING, SCRAPING OR REPLICATION
Without LoadLink’s prior written permission, you may not copy, reproduce, republish, sell, scrape, crawl, harvest, bulk-download, mirror, redistribute or commercially exploit LoadLink content or data. You may not use LoadLink information, branding, layouts, designs, software, database structures, workflows or business methods to create, support or improve a competing or substantially similar website, application, database, marketplace or service.

5. USER INFORMATION
You may use another user’s details only for the genuine purpose connected to the relevant listing, profile, job, contract or transaction. You may not sell, share, retain unnecessarily, misuse or use those details for spam, unrelated marketing, fraud or profiling.

6. INTELLECTUAL PROPERTY
LoadLink and its licensors retain all rights in the platform, branding, software, original content, layouts, databases, designs and business methods. Access gives you only a limited, revocable and non-transferable right to use the platform for its intended purpose.

7. SECURITY AND BLOCKED USERS
You may not bypass a suspension or block by using another account, false details, shared credentials, a different device, cleared browser data or any technical workaround. LoadLink may restrict access and preserve account and security records where reasonably necessary to protect the platform and its users.

8. ACCEPTANCE RECORDS AND PRIVACY
LoadLink may record your account identifier, agreement version, acceptance time and reasonable security audit information to administer access, prove acceptance and prevent abuse. Personal information must be handled in accordance with applicable South African law and LoadLink’s privacy notices.

9. BREACH AND ACCESS REMOVAL
A breach may result in suspension, blocking, removal of content, preservation of evidence and any lawful remedy available to LoadLink. You remain responsible for losses caused by your unlawful or unauthorised conduct.

10. GOVERNING LAW
This agreement is governed by the laws of the Republic of South Africa. Any mandatory consumer or other legal rights that cannot lawfully be excluded remain unaffected.

By entering LoadLink, you agree to comply with the current version of this agreement.`,
};

function isAuthRoute(pathname: string) {
  return AUTH_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

function readLocalAcceptance() {
  try {
    return window.localStorage.getItem(LOCAL_ACCEPTANCE_KEY) === "accepted";
  } catch {
    return false;
  }
}

function saveLocalAcceptance(accepted: boolean) {
  try {
    if (accepted) window.localStorage.setItem(LOCAL_ACCEPTANCE_KEY, "accepted");
    else window.localStorage.removeItem(LOCAL_ACCEPTANCE_KEY);
  } catch {
    // Storage restrictions must not break the gate.
  }
}

async function responseJson<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof payload?.error === "string" ? payload.error : "LoadLink could not verify access.";
    throw new Error(message);
  }
  return payload as T;
}

function normaliseAccess(result: AccessState, localAccepted: boolean): AccessState {
  const nda = result.nda || FALLBACK_NDA;
  const restricted = result.status === "blocked" || result.status === "suspended";

  if (restricted || result.isAdmin) return { ...result, nda };

  if (!result.authenticated || !result.nda) {
    return {
      ...result,
      nda,
      allowed: localAccepted,
      ndaAccepted: localAccepted,
      requiresAcceptance: !localAccepted,
    };
  }

  return { ...result, nda };
}

export default function LoadLinkAccessBoundary({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const [access, setAccess] = useState<AccessState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [declined, setDeclined] = useState(false);

  const exempt = isAuthRoute(pathname);

  const recordAccountAcceptance = useCallback(async (token: string) => {
    const response = await fetch("/api/access/nda", {
      method: "POST",
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action: "accept" }),
    });
    return responseJson<AccessState>(response);
  }, []);

  const loadAccess = useCallback(async () => {
    if (exempt) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    const localAccepted = readLocalAcceptance();

    if (!isSupabaseConfigured) {
      setAccess({
        authenticated: false,
        allowed: localAccepted,
        isAdmin: false,
        status: "guest",
        requiresAcceptance: !localAccepted,
        ndaAccepted: localAccepted,
        nda: FALLBACK_NDA,
      });
      setLoading(false);
      return;
    }

    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      const response = await fetch("/api/access/nda", {
        method: "GET",
        cache: "no-store",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      let result = normaliseAccess(await responseJson<AccessState>(response), localAccepted);

      if (
        token &&
        localAccepted &&
        result.authenticated &&
        result.status !== "blocked" &&
        result.status !== "suspended" &&
        !result.allowed &&
        result.requiresAcceptance
      ) {
        try {
          result = normaliseAccess(await recordAccountAcceptance(token), true);
        } catch {
          // The visible Enter button remains available when automatic linking fails.
        }
      }

      setAccess(result);
      setDeclined(false);
    } catch {
      let hasSession = false;
      try {
        const sessionResult = await supabase.auth.getSession();
        hasSession = Boolean(sessionResult.data.session);
      } catch {
        hasSession = false;
      }

      if (!hasSession) {
        setAccess({
          authenticated: false,
          allowed: localAccepted,
          isAdmin: false,
          status: "guest",
          requiresAcceptance: !localAccepted,
          ndaAccepted: localAccepted,
          nda: FALLBACK_NDA,
        });
      } else {
        setAccess({
          authenticated: true,
          allowed: false,
          isAdmin: false,
          status: "verification-error",
          requiresAcceptance: true,
          ndaAccepted: false,
          nda: FALLBACK_NDA,
        });
      }
    } finally {
      setLoading(false);
    }
  }, [exempt, recordAccountAcceptance]);

  useEffect(() => {
    void loadAccess();
  }, [loadAccess, pathname]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
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

  async function enterLoadLink() {
    if (busy) return;
    setBusy(true);
    setError("");

    try {
      if (!access?.authenticated) {
        saveLocalAcceptance(true);
        setAccess((current) =>
          current
            ? { ...current, allowed: true, ndaAccepted: true, requiresAcceptance: false, nda: current.nda || FALLBACK_NDA }
            : current,
        );
        setDeclined(false);
        return;
      }

      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        saveLocalAcceptance(true);
        setAccess((current) =>
          current
            ? { ...current, authenticated: false, status: "guest", allowed: true, ndaAccepted: true, requiresAcceptance: false }
            : current,
        );
        return;
      }

      const result = normaliseAccess(await recordAccountAcceptance(token), true);
      if (result.status === "blocked" || result.status === "suspended") {
        saveLocalAcceptance(false);
        setAccess(result);
        return;
      }

      saveLocalAcceptance(true);
      setAccess({ ...result, allowed: true, ndaAccepted: true, requiresAcceptance: false });
      setDeclined(false);
      window.dispatchEvent(new Event("loadlink-access-state-changed"));
    } catch (acceptError) {
      saveLocalAcceptance(false);
      setError(acceptError instanceof Error ? acceptError.message : "LoadLink could not confirm access.");
    } finally {
      setBusy(false);
    }
  }

  async function declineAgreement() {
    if (busy) return;
    setBusy(true);
    setError("");
    saveLocalAcceptance(false);

    try {
      if (access?.authenticated && isSupabaseConfigured) {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (token) {
          await fetch("/api/access/nda", {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ action: "decline" }),
          }).catch(() => undefined);
        }
      }
      setDeclined(true);
      setAccess((current) =>
        current ? { ...current, allowed: false, ndaAccepted: false, requiresAcceptance: true } : current,
      );
    } finally {
      setBusy(false);
    }
  }

  async function signOutBlockedAccount() {
    setBusy(true);
    try {
      saveLocalAcceptance(false);
      await supabase.auth.signOut();
      router.replace("/login");
    } finally {
      setBusy(false);
    }
  }

  if (exempt) return <>{children}</>;
  if (loading) return <AccessLoading />;
  if (access?.allowed) return <>{children}</>;

  if (access?.status === "blocked" || access?.status === "suspended") {
    const suspended = access.status === "suspended";
    return (
      <AccessShell>
        <div className="mx-auto max-w-xl text-center">
          <StatusIcon>!</StatusIcon>
          <p className="mt-6 text-xs font-black uppercase tracking-[0.22em] text-red-400">Account access restricted</p>
          <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] text-white">
            {suspended ? "Your LoadLink account is suspended" : "Your LoadLink account is blocked"}
          </h1>
          <p className="mt-4 text-sm leading-7 text-white/65">
            {access.reason || "This account cannot access LoadLink because it has been restricted by the Control Centre."}
          </p>
          {suspended && access.suspendedUntil ? (
            <p className="mt-3 text-xs font-bold text-[#f6b800]">
              Scheduled review: {new Date(access.suspendedUntil).toLocaleString("en-ZA")}
            </p>
          ) : null}
          <p className="mt-5 border border-red-400/30 bg-red-400/10 p-4 text-left text-xs leading-6 text-red-100">
            Creating another account, using false details, sharing credentials or using a technical workaround to avoid this restriction is prohibited.
          </p>
          <button
            type="button"
            onClick={() => void signOutBlockedAccount()}
            disabled={busy}
            className="mt-7 h-12 w-full bg-white px-5 text-xs font-black uppercase tracking-[0.14em] text-black disabled:opacity-50"
          >
            {busy ? "Signing out…" : "Sign out"}
          </button>
          <a
            href="mailto:loadlinksouthafrica@gmail.com"
            className="mt-4 inline-block text-xs font-black text-[#f6b800] underline underline-offset-4"
          >
            Contact LoadLink support
          </a>
        </div>
      </AccessShell>
    );
  }

  if (declined) {
    return (
      <AccessShell>
        <div className="mx-auto max-w-xl text-center">
          <StatusIcon>×</StatusIcon>
          <h1 className="mt-6 text-3xl font-black tracking-[-0.04em] text-white">NDA declined</h1>
          <p className="mt-4 text-sm leading-7 text-white/65">You cannot enter LoadLink unless you accept the agreement.</p>
          <button
            type="button"
            onClick={() => setDeclined(false)}
            className="mt-7 h-12 w-full bg-[#f6b800] px-5 text-xs font-black uppercase tracking-[0.14em] text-black"
          >
            Return
          </button>
        </div>
      </AccessShell>
    );
  }

  const nda = access?.nda || FALLBACK_NDA;

  return (
    <AccessShell>
      <div className="mx-auto w-full max-w-xl">
        <div className="border border-[#f6b800]/40 bg-[#080808] p-5 md:p-6">
          <p className="text-base font-black leading-7 text-white md:text-lg">
            By clicking <span className="text-[#f6b800]">Enter LoadLink</span>, you agree to the LoadLink Confidentiality and Restricted-Use Agreement.
          </p>

          <details className="mt-5 border-t border-white/10 pt-4">
            <summary className="cursor-pointer list-none text-xs font-black uppercase tracking-[0.14em] text-[#f6b800]">
              Read the NDA
            </summary>
            <div className="mt-4 max-h-[42vh] overflow-y-auto whitespace-pre-wrap border border-white/10 bg-black px-4 py-4 text-xs leading-6 text-white/65">
              {nda.agreementText}
            </div>
          </details>
        </div>

        {error ? (
          <div role="alert" className="mt-4 border border-red-400/30 bg-red-400/10 p-3 text-left text-xs font-bold leading-5 text-red-100">
            {error}
          </div>
        ) : null}

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => void enterLoadLink()}
            disabled={busy}
            className="min-h-13 bg-[#f6b800] px-5 py-4 text-xs font-black uppercase tracking-[0.14em] text-black disabled:cursor-not-allowed disabled:opacity-50 sm:col-span-2"
          >
            {busy ? "Checking access…" : "Enter LoadLink"}
          </button>
          <button
            type="button"
            onClick={() => void declineAgreement()}
            disabled={busy}
            className="min-h-13 border border-white/20 px-5 py-4 text-xs font-black uppercase tracking-[0.14em] text-white disabled:opacity-50"
          >
            Decline
          </button>
        </div>
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
      <footer className="mx-auto mt-8 max-w-xl border-t border-white/10 pt-5 text-center text-[11px] leading-5 text-white/40">
        LoadLink South Africa · loadlinksouthafrica@gmail.com
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
        <p className="mt-4 text-xs font-black uppercase tracking-[0.16em] text-white/55">Checking access</p>
      </div>
    </main>
  );
}

function StatusIcon({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[#f6b800]/50 bg-[#f6b800]/10 text-2xl font-black text-[#f6b800]">
      {children}
    </div>
  );
}
