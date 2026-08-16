"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

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

  if (!/(needed|work.?starts|expiry|expires|due|appointment|scheduled|schedule|recurrence|renewal|valid.?until)/i.test(context) && input.dataset.loadlinkFutureDate !== "true") {
    return;
  }

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

function applyVehicleEnhancements() {
  document.querySelectorAll<HTMLInputElement>('input[type="date"]').forEach(bindFutureDateInput);
}

export default function LoadLinkVehicleRuntime() {
  useEffect(() => {
    let active = true;

    const syncUser = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (active && user?.id) scopeVehicleDraft(user.id);
      } catch {
        // The listing page owns its own authentication recovery.
      }
    };

    void syncUser();
    applyVehicleEnhancements();

    const observer = new MutationObserver(() => applyVehicleEnhancements());
    observer.observe(document.body, { childList: true, subtree: true });

    const prepareTarget = (event: Event) => {
      const element = event.target instanceof Element ? event.target : null;
      const input = element?.closest('input[type="date"]');
      if (input instanceof HTMLInputElement) bindFutureDateInput(input);
    };

    document.addEventListener("pointerdown", prepareTarget, true);
    document.addEventListener("focusin", prepareTarget, true);

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.id) scopeVehicleDraft(session.user.id);
    });

    return () => {
      active = false;
      observer.disconnect();
      document.removeEventListener("pointerdown", prepareTarget, true);
      document.removeEventListener("focusin", prepareTarget, true);
      authListener.subscription.unsubscribe();
    };
  }, []);

  return (
    <span
      hidden
      aria-hidden="true"
      data-loadlink-vehicle-runtime="draft-and-date-only-v1"
      data-loadlink-package-gate="disabled-on-listing-route"
    />
  );
}
