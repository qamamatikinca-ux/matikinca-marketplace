"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { getBuyerKeys, getOwnerKeys } from "@/lib/chatKeys";
import { supabase } from "@/lib/supabaseClient";

type ChatMediaMessage = { id: string; attachment_id?: string | null; file_name?: string | null; file_type?: string | null };
type AttachmentPayload = { file_base64: string; file_type: string; file_name?: string | null };

function currentThread() {
  const params = new URLSearchParams(window.location.search);
  return params.get("thread") || params.get("conversation") || "";
}

function base64Url(payload: AttachmentPayload) {
  const raw = atob(payload.file_base64);
  const bytes = new Uint8Array(raw.length);
  for (let index = 0; index < raw.length; index += 1) bytes[index] = raw.charCodeAt(index);
  return URL.createObjectURL(new Blob([bytes], { type: payload.file_type || "application/octet-stream" }));
}

async function readThread(threadId: string) {
  const keys = Array.from(new Set([...getBuyerKeys(), ...getOwnerKeys()])).filter(Boolean);
  for (const accessKey of keys) {
    const result = await supabase.rpc("get_listing_guest_messages", { p_thread_id: threadId, p_access_key: accessKey });
    if (!result.error && Array.isArray(result.data)) return { accessKey, messages: result.data as ChatMediaMessage[] };
  }
  return null;
}

function findAttachmentButton(fileName: string, attachmentId: string) {
  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>(".loadlink-chat-panel button"));
  return buttons.find((button) => {
    if (button.dataset.loadlinkInlineMedia === attachmentId) return true;
    if (button.dataset.loadlinkInlineMedia) return false;
    const text = (button.textContent || "").replace(/\s+/g, " ").trim();
    return text.includes(fileName) && /photo|open/i.test(text);
  }) || null;
}

function renderPreview(button: HTMLButtonElement, url: string, fileName: string, attachmentId: string) {
  button.dataset.loadlinkInlineMedia = attachmentId;
  button.setAttribute("aria-label", `Open ${fileName}`);
  button.classList.add("loadlink-inline-image-attachment");
  const image = document.createElement("img");
  image.src = url; image.alt = fileName || "Shared image"; image.loading = "lazy"; image.decoding = "async";
  image.dataset.loadlinkInlineImage = "true";
  const caption = document.createElement("span");
  caption.dataset.loadlinkInlineImageCaption = "true";
  const name = document.createElement("strong"); name.textContent = fileName || "Shared image";
  const hint = document.createElement("span"); hint.textContent = "Photo · tap to open";
  caption.append(name, hint);
  button.replaceChildren(image, caption);
}

export default function LoadLinkChatMediaPreview20260823() {
  const pathname = usePathname();
  const cacheRef = useRef(new Map<string, string>());
  const workingRef = useRef(false);
  const lastThreadRef = useRef("");
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (pathname !== "/messages") return;
    let alive = true;

    async function hydrate() {
      if (!alive || workingRef.current) return;
      const threadId = currentThread();
      if (!threadId) return;
      workingRef.current = true;
      try {
        const thread = await readThread(threadId);
        if (!thread || !alive) return;
        lastThreadRef.current = threadId;
        const images = thread.messages.filter((message) => message.attachment_id && message.file_name && message.file_type?.startsWith("image/"));
        for (const message of images) {
          if (!alive || !message.attachment_id || !message.file_name) break;
          const button = findAttachmentButton(message.file_name, message.attachment_id);
          if (!button) continue;
          let url = cacheRef.current.get(message.attachment_id) || "";
          if (!url) {
            const result = await supabase.rpc("get_listing_guest_attachment", { p_attachment_id: message.attachment_id, p_access_key: thread.accessKey });
            if (result.error) continue;
            const payload = (Array.isArray(result.data) ? result.data[0] : result.data) as AttachmentPayload | undefined;
            if (!payload?.file_base64) continue;
            url = base64Url(payload);
            cacheRef.current.set(message.attachment_id, url);
          }
          renderPreview(button, url, message.file_name, message.attachment_id);
        }
      } finally {
        workingRef.current = false;
      }
    }

    const schedule = () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => void hydrate(), lastThreadRef.current === currentThread() ? 180 : 20);
    };
    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("popstate", schedule);
    window.addEventListener("loadlink-chat-unread-updated", schedule);
    return () => {
      alive = false; observer.disconnect(); window.removeEventListener("popstate", schedule); window.removeEventListener("loadlink-chat-unread-updated", schedule);
      if (timerRef.current) window.clearTimeout(timerRef.current);
      cacheRef.current.forEach((url) => URL.revokeObjectURL(url)); cacheRef.current.clear();
    };
  }, [pathname]);

  return null;
}
