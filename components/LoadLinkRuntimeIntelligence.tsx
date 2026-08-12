"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  getLoadLinkIntelligence,
  requestLoadLinkPlan,
  startLoadLinkPayment,
  verifyReturnedLoadLinkPayment,
  type LoadLinkIntelligenceState,
} from "@/lib/loadlinkIntelligence";

type Notice = {
  id: string;
  title: string;
  detail?: string;
  tone?: "neutral" | "warning" | "success";
};

const entitled = new Set(["active", "trial", "trialing", "grace_period", "cancelled"]);
const futureWords = /(needed|work.?starts|expiry|expires|due|appointment|scheduled|schedule|recurrence|renewal|valid.?until)/i;

function scopeVehicleDraft(userId: string) {
  if (!userId || typeof window === "undefined") return;
  const ownerKey = "loadlink-smart-vehicle-draft-owner";
  const draftKey = "loadlink-vehicle-draft-v1";
  const submissionKey = "loadlink-vehicle-submission-id";
  const previous = localStorage.getItem(ownerKey);
  if (!previous) {
    localStorage.setItem(ownerKey, userId);
    return;
  }
  if (previous === userId) return;

  const oldDraft = localStorage.getItem(draftKey);
  const oldSubmission = localStorage.getItem(submissionKey);
  if (oldDraft) localStorage.setItem(`${draftKey}:${previous}`, oldDraft);
  if (oldSubmission) localStorage.setItem(`${submissionKey}:${previous}`, oldSubmission);

  const nextDraft = localStorage.getItem(`${draftKey}:${userId}`);
  const nextSubmission = localStorage.getItem(`${submissionKey}:${userId}`);
  if (nextDraft) localStorage.setItem(draftKey, nextDraft);
  else localStorage.removeItem(draftKey);
  if (nextSubmission) localStorage.setItem(submissionKey, nextSubmission);
  else localStorage.removeItem(submissionKey);
  localStorage.setItem(ownerKey, userId);
}

function todayIso() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function bindFutureDateInput(input: HTMLInputElement) {
  if (input.type !== "date" || input.dataset.loadlinkAllowPast === "true") return;
  const context = [
    input.name,
    input.id,
    input.getAttribute("aria-label"),
    input.placeholder,
    input.closest("label")?.textContent,
  ]
    .filter(Boolean)
    .join(" ");

  if (!futureWords.test(context) && input.dataset.loadlinkFutureDate !== "true") return;
  input.min = input.min || todayIso();
  if (input.dataset.loadlinkSmartFutureBound === "1") return;
  input.dataset.loadlinkSmartFutureBound = "1";

  input.addEventListener("change", () => {
    if (!input.value) return;
    const chosen = new Date(`${input.value}T00:00:00`);
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    if (chosen >= base) return;
    input.value = "";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    window.dispatchEvent(
      new CustomEvent("loadlink:notice", {
        detail: {
          title: "That date has already passed.",
          detail: "Choose today or a future date.",
          tone: "warning",
        },
      }),
    );
  });
}

function containAvatar(node: HTMLElement) {
  node.style.overflow = "hidden";
  node.style.borderRadius = "9999px";
  const img = node.querySelector("img") as HTMLImageElement | null;
  if (!img) return;
  img.style.width = "100%";
  img.style.height = "100%";
  img.style.objectFit = "cover";
  img.style.display = "block";
}

function applyRuntimeEnhancements() {
  document.querySelectorAll<HTMLInputElement>('input[type="date"]').forEach(bindFutureDateInput);
  document
    .querySelectorAll<HTMLElement>('[data-loadlink-avatar],[aria-label$=" profile picture"]')
    .forEach(containAvatar);
}

export default function LoadLinkRuntimeIntelligence() {
  const pathname = usePathname();
  const [state, setState] = useState<LoadLinkIntelligenceState | null>(null);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const timer = useRef<number | null>(null);

  const refresh = useCallback(async () => {
    try {
      const next = await getLoadLinkIntelligence();
      setState(next);
      if (next.user_id) scopeVehicleDraft(next.user_id);
      return next;
    } catch {
      return null;
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const delayed = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        if (document.visibilityState === "visible") void refresh();
      }, 420);
    };
    const online = () => {
      setNotice({
        id: "online",
        title: "You’re back online.",
        detail: "LoadLink can continue normally.",
        tone: "success",
      });
      delayed();
    };
    const offline = () =>
      setNotice({
        id: "offline",
        title: "Your connection is offline.",
        detail: "Keep this page open. LoadLink will continue when the connection returns.",
        tone: "warning",
      });
    const custom = (event: Event) => {
      const detail = (event as CustomEvent).detail || {};
      setNotice({
        id: String(detail.id || Date.now()),
        title: String(detail.title || "LoadLink"),
        detail: detail.detail ? String(detail.detail) : undefined,
        tone: detail.tone || "neutral",
      });
    };

    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    window.addEventListener("focus", delayed);
    window.addEventListener("loadlink:account-changed", delayed);
    window.addEventListener("loadlink-account-state-changed", delayed);
    window.addEventListener("loadlink-account-state-synced", delayed);
    window.addEventListener("loadlink:notice", custom);

    const { data: listener } = supabase.auth.onAuthStateChange(() => delayed());
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel("loadlink-account-intelligence");
      channel.onmessage = delayed;
    } catch {}

    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
      window.removeEventListener("focus", delayed);
      window.removeEventListener("loadlink:account-changed", delayed);
      window.removeEventListener("loadlink-account-state-changed", delayed);
      window.removeEventListener("loadlink-account-state-synced", delayed);
      window.removeEventListener("loadlink:notice", custom);
      listener.subscription.unsubscribe();
      channel?.close();
      if (timer.current) clearTimeout(timer.current);
    };
  }, [refresh]);

  useEffect(() => {
    applyRuntimeEnhancements();
    const frame = window.requestAnimationFrame(applyRuntimeEnhancements);
    const delayed = window.setTimeout(applyRuntimeEnhancements, 300);

    const prepareTarget = (event: Event) => {
      const element = event.target instanceof Element ? event.target : null;
      const input = element?.closest('input[type="date"]');
      if (input instanceof HTMLInputElement) bindFutureDateInput(input);
    };
    const refreshVisuals = () => window.requestAnimationFrame(applyRuntimeEnhancements);

    document.addEventListener("pointerdown", prepareTarget, true);
    document.addEventListener("focusin", prepareTarget, true);
    window.addEventListener("loadlink-profile-updated", refreshVisuals);
    window.addEventListener("loadlink:content-updated", refreshVisuals);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(delayed);
      document.removeEventListener("pointerdown", prepareTarget, true);
      document.removeEventListener("focusin", prepareTarget, true);
      window.removeEventListener("loadlink-profile-updated", refreshVisuals);
      window.removeEventListener("loadlink:content-updated", refreshVisuals);
    };
  }, [pathname]);

  return (
    <>
      <PaymentReturn pathname={pathname} refresh={refresh} />
      <ListingGate pathname={pathname} state={state} ready={ready} refresh={refresh} />
      {notice ? (
        <div className="pointer-events-none fixed inset-x-3 top-[76px] z-[130] mx-auto max-w-md">
          <div
            role="status"
            className="pointer-events-auto flex items-start gap-3 rounded-[18px] border border-black/10 bg-white/96 p-3.5 text-black shadow-2xl dark:border-white/10 dark:bg-[#111]/96 dark:text-white"
          >
            <span
              className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                notice.tone === "success"
                  ? "bg-emerald-500"
                  : notice.tone === "warning"
                    ? "bg-[#f6b800]"
                    : "bg-current opacity-30"
              }`}
            />
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-black">{notice.title}</div>
              {notice.detail ? (
                <div className="mt-1 text-[9px] font-semibold leading-4 opacity-50">{notice.detail}</div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => setNotice(null)}
              className="text-xs font-black opacity-35"
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

function PaymentReturn({
  pathname,
  refresh,
}: {
  pathname: string;
  refresh: () => Promise<LoadLinkIntelligenceState | null>;
}) {
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const once = useRef(false);

  useEffect(() => {
    if (pathname !== "/packages" || once.current) return;
    const query = new URLSearchParams(location.search);
    if (query.get("payment") !== "return") return;
    const reference = query.get("reference") || query.get("trxref") || "";
    once.current = true;
    if (!reference) {
      setMessage("LoadLink returned from payment but could not find the payment reference.");
      return;
    }
    setWorking(true);
    void (async () => {
      try {
        await verifyReturnedLoadLinkPayment(reference);
        const next = await refresh();
        if (next && entitled.has(String(next.plan_state))) {
          if (next.plan === "dealer" && !next.dealer_ready) {
            location.replace("/dealer");
            return;
          }
          const dealership =
            next.plan === "dealer" && next.dealer_profile_id
              ? `&dealership=${encodeURIComponent(next.dealer_profile_id)}`
              : "";
          location.replace(`/list-your-vehicle?plan=${next.plan}&smart=1${dealership}`);
          return;
        }
        setMessage("Payment was received. LoadLink is finishing the account update — this usually takes only a moment.");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "LoadLink is still confirming your payment.");
      } finally {
        setWorking(false);
      }
    })();
  }, [pathname, refresh]);

  if (!working && !message) return null;
  return (
    <div className="fixed inset-0 z-[125] flex items-center justify-center bg-black/55 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[24px] border border-white/10 bg-[#0b0b0b] p-6 text-center text-white shadow-2xl">
        {working ? <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-[#f6b800]" /> : null}
        <h2 className="mt-4 text-xl font-black">Confirming your LoadLink plan</h2>
        <p className="mt-2 text-xs font-semibold leading-5 text-white/50">{message || "Checking the payment securely…"}</p>
      </div>
    </div>
  );
}

function ListingGate({
  pathname,
  state,
  ready,
  refresh,
}: {
  pathname: string;
  state: LoadLinkIntelligenceState | null;
  ready: boolean;
  refresh: () => Promise<LoadLinkIntelligenceState | null>;
}) {
  const [dealer, setDealer] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const redirected = useRef(false);
  const on = pathname === "/list-your-vehicle";

  useEffect(() => {
    if (!on) {
      redirected.current = false;
      return;
    }
    if (!state || redirected.current) return;
    const query = new URLSearchParams(location.search);
    if (state.authenticated && state.capabilities.can_post_vehicle && entitled.has(String(state.plan_state))) {
      const wanted = state.plan === "dealer" ? state.dealer_profile_id || "" : "";
      if (
        query.get("plan") !== state.plan ||
        (state.plan === "dealer" && wanted && query.get("dealership") !== wanted)
      ) {
        redirected.current = true;
        location.replace(
          `/list-your-vehicle?plan=${state.plan}&smart=1${
            state.plan === "dealer" && wanted ? `&dealership=${encodeURIComponent(wanted)}` : ""
          }`,
        );
      }
    }
  }, [on, state]);

  const gate = useMemo(() => {
    if (!on) return "none";
    if (!ready) return "loading";
    if (!state) return "none";
    if (!state.authenticated) return "signin";
    if (["blocked", "suspended"].includes(state.account_status)) return "blocked";
    if (state.plan === "dealer" && entitled.has(String(state.plan_state)) && !state.dealer_ready) {
      if (!state.dealer_profile_id) return "dealer_setup";
      if (/rejected|changes/i.test(String(state.dealer_status))) return "dealer_changes";
      return "dealer_review";
    }
    if (state.capabilities.can_post_vehicle && entitled.has(String(state.plan_state))) return "none";
    if (state.plan_state === "under_review") return "review";
    if (["approved_for_payment", "payment_pending", "payment_failed"].includes(String(state.plan_state))) return "payment";
    if (state.plan_state === "rejected") return "rejected";
    if (["past_due", "expired"].includes(String(state.plan_state))) return "renew";
    return "choose";
  }, [on, ready, state]);

  if (!on || gate === "none") return null;

  const cls = "fixed inset-x-0 bottom-0 top-[64px] z-[110] overflow-y-auto bg-[#f4f0e7] text-black dark:bg-black dark:text-white";

  async function request(plan: "pro" | "dealer") {
    setBusy(true);
    setMessage("");
    try {
      const result = (await requestLoadLinkPlan(plan)) as { message?: string } | null;
      setMessage(result?.message || "Your request has been received.");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "LoadLink could not submit that request.");
    } finally {
      setBusy(false);
    }
  }

  async function pay() {
    if (!state?.plan_request_id) return;
    setBusy(true);
    try {
      const result = await startLoadLinkPayment(state.plan_request_id);
      location.assign(result.authorization_url);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "LoadLink could not continue payment.");
      setBusy(false);
    }
  }

  if (gate === "loading") {
    return (
      <div className={cls}>
        <div className="flex min-h-full items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-current/10 border-t-[#f6b800]" />
            <div className="mt-3 text-xs font-black opacity-50">Loading LoadLink…</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cls}>
      <div className="mx-auto flex min-h-full max-w-3xl items-start justify-center px-4 py-10">
        <div className="w-full">
          {gate === "signin" ? (
            <Card
              title="Sign in to list a vehicle"
              detail="LoadLink needs your account so your plan, approvals and listing progress stay connected."
              action="Sign in"
              go={() => location.assign(`/login?returnTo=${encodeURIComponent("/list-your-vehicle")}`)}
            />
          ) : null}
          {gate === "blocked" ? (
            <Card
              title={`You can’t post while this account is ${state?.account_status}.`}
              detail={state?.account_reason || "Open your account status for more information."}
              action="View account status"
              go={() => location.assign("/account")}
            />
          ) : null}
          {gate === "review" ? (
            <Card
              title="Your plan request is under review."
              detail="You don’t need to submit it again. LoadLink will notify you when it is ready."
            />
          ) : null}
          {gate === "payment" ? (
            <Card
              title={state?.plan_state === "payment_failed" ? "Your previous payment didn’t complete." : "Your plan is ready for payment."}
              detail="Your request is saved. Continue when you’re ready."
              action={busy ? "Opening payment…" : "Continue payment"}
              go={() => void pay()}
            />
          ) : null}
          {gate === "rejected" ? (
            <Card
              title="This plan request wasn’t approved."
              detail={state?.plan_request_reason || "Review the reason and try again when you are ready."}
              action="View plans"
              go={() => location.assign("/packages#plans")}
            />
          ) : null}
          {gate === "renew" ? (
            <Card
              title="Your vehicle-listing access needs attention."
              detail={
                state?.plan_state === "past_due"
                  ? "The latest payment needs attention before new vehicle listings can be published."
                  : "Your previous plan has ended. Choose a plan to continue advertising vehicles."
              }
              action="View plans"
              go={() => location.assign("/packages#plans")}
            />
          ) : null}
          {gate === "dealer_setup" ? (
            <Card
              title="Set up your dealership first."
              detail="Your Dealer payment is active. Add the dealership information LoadLink needs, then it will go to Control Centre for approval."
              action="Continue dealership setup"
              go={() => location.assign("/dealer")}
            />
          ) : null}
          {gate === "dealer_review" ? (
            <Card
              title="Your dealership is being reviewed."
              detail="Your Dealer plan is active, but stock publishing stays locked until the dealership itself is approved in Control Centre."
              action="Open Dealer"
              go={() => location.assign("/dealer")}
            />
          ) : null}
          {gate === "dealer_changes" ? (
            <Card
              title="Your dealership needs changes before stock can go live."
              detail="Open Dealer to see what needs attention. Your paid plan remains on the account."
              action="Review dealership"
              go={() => location.assign("/dealer")}
            />
          ) : null}
          {gate === "choose" ? (
            dealer === null ? (
              <div className="rounded-[26px] border border-current/10 bg-current/[.025] p-6">
                <h1 className="text-[32px] font-black tracking-[-.055em]">Are you a dealership?</h1>
                <div className="mt-6 grid grid-cols-2 gap-3">
                  <Choice title="Yes" detail="I sell vehicles as a dealership or business." go={() => setDealer(true)} />
                  <Choice title="No" detail="I’m an individual owner or operator." go={() => setDealer(false)} />
                </div>
              </div>
            ) : (
              <div className="rounded-[26px] border border-current/10 bg-current/[.025] p-6">
                <div className="text-[10px] font-black uppercase opacity-35">Recommended</div>
                <h2 className="mt-2 text-[34px] font-black">{dealer ? "Dealer" : "Pro"}</h2>
                <div className="mt-2 text-[22px] font-black">
                  {dealer ? "R2 999" : "R399"}
                  <span className="ml-2 text-xs opacity-45">/ month</span>
                </div>
                <p className="mt-3 text-xs font-semibold opacity-50">
                  {dealer
                    ? "For dealership stock, showroom, Status, customers, leads and team tools."
                    : "For individual owners and operators who advertise vehicles regularly."}
                </p>
                <div className="mt-6 flex gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void request(dealer ? "dealer" : "pro")}
                    className="h-12 flex-1 rounded-xl bg-[#f6b800] text-sm font-black text-black disabled:opacity-45"
                  >
                    {busy ? "Sending…" : `Request ${dealer ? "Dealer" : "Pro"}`}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDealer(null)}
                    className="h-12 rounded-xl border border-current/10 px-4 text-xs font-black"
                  >
                    Back
                  </button>
                </div>
              </div>
            )
          ) : null}
          {message ? <div className="mt-4 rounded-[16px] border border-current/10 p-4 text-xs font-bold">{message}</div> : null}
        </div>
      </div>
    </div>
  );
}

function Card({
  title,
  detail,
  action,
  go,
}: {
  title: string;
  detail: string;
  action?: string;
  go?: () => void;
}) {
  return (
    <div className="rounded-[26px] border border-current/10 bg-current/[.025] p-6">
      <h1 className="text-[30px] font-black tracking-[-.05em]">{title}</h1>
      <p className="mt-3 text-xs font-semibold leading-5 opacity-50">{detail}</p>
      {action && go ? (
        <button type="button" onClick={go} className="mt-6 h-12 rounded-xl bg-[#f6b800] px-5 text-sm font-black text-black">
          {action}
        </button>
      ) : null}
    </div>
  );
}

function Choice({ title, detail, go }: { title: string; detail: string; go: () => void }) {
  return (
    <button type="button" onClick={go} className="min-h-[104px] rounded-[20px] border border-current/10 p-4 text-left">
      <span className="block text-lg font-black">{title}</span>
      <span className="mt-2 block text-[10px] font-semibold opacity-45">{detail}</span>
    </button>
  );
}
