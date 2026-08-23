"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const INTEGER_HINT = /(quantity|count|year|seats?|axles?|days?|weeks?|months?|hours?|minutes?|capacity|units?|credits?|phone|mobile|contact.?number|otp|code)/i;
const DECIMAL_HINT = /(price|rate|amount|weight|tonnage|payload|distance|km|kilomet|height|width|length|volume|litre|liter)/i;

function applyInputIntent(root: ParentNode = document) {
  root.querySelectorAll<HTMLInputElement>("input").forEach((input) => {
    const key = `${input.name} ${input.id} ${input.placeholder} ${input.getAttribute("aria-label") || ""}`;
    if (input.type === "number") {
      const integerOnly = input.step === "1" || INTEGER_HINT.test(key);
      input.inputMode = integerOnly ? "numeric" : "decimal";
      if (integerOnly && !input.pattern) input.pattern = "[0-9]*";
      input.dataset.loadlinkNumeric = integerOnly ? "integer" : "decimal";
      return;
    }
    if (input.type === "tel" || /phone|mobile|contact.?number/i.test(key)) {
      input.inputMode = "tel";
      input.dataset.loadlinkNumeric = "telephone";
      return;
    }
    if (INTEGER_HINT.test(key) && !["date", "datetime-local", "time", "month", "week"].includes(input.type)) {
      input.inputMode = "numeric";
      if (!input.pattern) input.pattern = "[0-9]*";
      input.dataset.loadlinkNumeric = "integer";
      return;
    }
    if (DECIMAL_HINT.test(key) && input.type === "text") {
      input.inputMode = "decimal";
      input.dataset.loadlinkNumeric = "decimal";
    }
    if (["date", "datetime-local", "time", "month", "week"].includes(input.type)) {
      input.dataset.loadlinkDateControl = "true";
    }
  });
}

function classifyPage(pathname: string) {
  if (pathname.startsWith("/messages")) return "messages";
  if (pathname.startsWith("/dealership/")) return "dealership-showroom";
  if (pathname.startsWith("/dealer")) return "dealer-centre";
  if (pathname.startsWith("/quick-links")) return "quick-links";
  if (pathname.startsWith("/help")) return "help";
  if (pathname.startsWith("/notifications")) return "notifications";
  if (pathname.startsWith("/packages")) return "packages";
  if (pathname.startsWith("/contracts")) return "contracts";
  if (pathname.startsWith("/jobs")) return "jobs";
  return "default";
}

export default function LoadLinkMajorUpdate20260823() {
  const pathname = usePathname();

  useEffect(() => {
    document.body.dataset.loadlinkPage = classifyPage(pathname);
    if (!pathname.startsWith("/messages")) {
      requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior }));
    }
  }, [pathname]);

  useEffect(() => {
    applyInputIntent();
    const observer = new MutationObserver((records) => {
      records.forEach((record) => record.addedNodes.forEach((node) => {
        if (!(node instanceof HTMLElement)) return;
        if (node.matches("input")) applyInputIntent(node.parentNode || document);
        else applyInputIntent(node);
      }));
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
