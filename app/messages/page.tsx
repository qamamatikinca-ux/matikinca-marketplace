"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AccessibleDialog from "@/components/platform/AccessibleDialog";
import EmptyState from "@/components/platform/EmptyState";
import ProfessionalHeader from "@/components/platform/ProfessionalHeader";
import { secureUpload } from "@/lib/client/secureUpload";
import { currentRelativePath, isAuthenticatedUser, loginHref } from "@/lib/auth";
import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

type Conversation = {
  id: string; listing_id: string | null; listing_title: string; other_user_id: string;
  other_name: string; other_phone: string | null; last_message: string | null;
  last_message_at: string | null; unread_count: number | string | null; other_last_seen: string | null;
};
type Message = { id: string; conversation_id: string; sender_id: string; body: string; file_path: string | null; file_name: string | null; file_type: string | null; created_at: string };
type BlockState = { blocked_by_me: boolean; blocked_by_other: boolean };

const QUICK_REPLIES = ["Hi, is this still available?", "Please share more information.", "Can we arrange a call?", "Thank you, I will get back to you."];
const MAX_FILE = 8 * 1024 * 1024;

function formatTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value); const today = date.toDateString() === new Date().toDateString();
  return new Intl.DateTimeFormat("en-ZA", today ? { hour: "2-digit", minute: "2-digit" } : { day: "2-digit", month: "short" }).format(date);
}
function activity(value: string | null) {
  if (!value) return "Activity unavailable";
  const minutes = Math.floor((Date.now() - new Date(value).getTime()) / 60000);
  if (minutes < 2) return "Active now";
  if (minutes < 60) return `Active ${minutes} min ago`;
  if (minutes < 1440) return `Active ${Math.floor(minutes / 60)} hr ago`;
  return `Last active ${new Date(value).toLocaleDateString("en-ZA")}`;
}
function safeError(error: unknown) {
  const value = error instanceof Error ? error.message : "The request could not be completed.";
  if (/daily message limit/i.test(value)) return "You have reached today’s 50-message Standard limit. Pro and Dealership accounts have unlimited messaging.";
  if (/blocked/i.test(value)) return "This conversation is blocked. Unblock it before sending a message.";
  if (/function|schema cache|does not exist/i.test(value)) return "Apply the professional marketplace Supabase migration, then refresh this page.";
  return value;
}

export default function MessagesPage() {
  const router = useRouter();
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  const [userId, setUserId] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [remaining, setRemaining] = useState(50);
  const [query, setQuery] = useState("");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [block, setBlock] = useState<BlockState>({ blocked_by_me: false, blocked_by_other: false });
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [media, setMedia] = useState<{ url: string; name: string; type: string } | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const selected = useMemo(() => conversations.find((item) => item.id === selectedId) || null, [conversations, selectedId]);
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return conversations;
    return conversations.filter((item) => `${item.other_name} ${item.listing_title} ${item.last_message || ""}`.toLowerCase().includes(needle));
  }, [conversations, query]);

  const loadConversations = useCallback(async (preferred?: string) => {
    const result = await supabase.rpc("get_my_conversations");
    if (result.error) throw result.error;
    const rows = (result.data || []) as Conversation[];
    setConversations(rows);
    const next = preferred || selectedId || (window.innerWidth >= 768 ? rows[0]?.id || "" : "");
    if (next && rows.some((row) => row.id === next)) setSelectedId(next);
    window.dispatchEvent(new Event("loadlink-chat-unread-updated"));
  }, [selectedId]);

  const loadMessages = useCallback(async (conversationId: string) => {
    const [messageResult, blockResult, remainingResult] = await Promise.all([
      supabase.rpc("get_conversation_messages", { p_conversation_id: conversationId }),
      supabase.rpc("loadlink_get_conversation_block", { p_conversation_id: conversationId }),
      supabase.rpc("get_daily_message_remaining"),
    ]);
    if (messageResult.error) throw messageResult.error;
    setMessages((messageResult.data || []) as Message[]);
    setBlock((blockResult.data || { blocked_by_me: false, blocked_by_other: false }) as BlockState);
    setRemaining(Math.max(0, Number(remainingResult.data ?? 50)));
    await supabase.rpc("mark_conversation_read", { p_conversation_id: conversationId });
    window.dispatchEvent(new Event("loadlink-chat-unread-updated"));
    window.setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 40);
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) { setError("Messaging is not connected on this deployment."); setLoading(false); return; }
    let active = true;
    void (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!isAuthenticatedUser(user)) { router.replace(loginHref(currentRelativePath())); return; }
        setUserId(user.id);
        const params = new URLSearchParams(window.location.search);
        let target = params.get("thread") || "";
        const listingId = params.get("listing");
        if (listingId) {
          const opened = await supabase.rpc("loadlink_start_listing_conversation", { p_listing_id: listingId });
          if (opened.error) throw opened.error;
          target = String(opened.data || "");
          window.history.replaceState({}, "", target ? `/messages?thread=${target}` : "/messages");
        }
        await loadConversations(target);
      } catch (cause) { if (active) setError(safeError(cause)); }
      finally { if (active) setLoading(false); }
    })();
    const safety = window.setTimeout(() => { if (active) { setLoading(false); setError((value) => value || "The inbox took too long to load. Check your connection and refresh."); } }, 9000);
    return () => { active = false; window.clearTimeout(safety); };
  }, [loadConversations, router]);

  useEffect(() => {
    if (!selectedId) { setMessages([]); return; }
    void loadMessages(selectedId).catch((cause) => setError(safeError(cause)));
    const channel = supabase.channel(`conversation:${selectedId}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages", filter: `conversation_id=eq.${selectedId}` }, () => {
      void loadMessages(selectedId); void loadConversations();
    }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [loadConversations, loadMessages, selectedId]);

  async function send(event?: FormEvent, attachment?: File) {
    event?.preventDefault();
    if (!selected || sending || block.blocked_by_me || block.blocked_by_other) return;
    if (!text.trim() && !attachment) return;
    setSending(true); setError("");
    try {
      let upload: Awaited<ReturnType<typeof secureUpload>> | null = null;
      if (attachment) {
        if (attachment.size > MAX_FILE) throw new Error("Attachments must be smaller than 8 MB.");
        upload = await secureUpload(attachment, "message-attachment", attachment.name, selected.id);
      }
      const result = await supabase.rpc("send_chat_message", {
        p_conversation_id: selected.id,
        p_body: text.trim(),
        p_file_path: upload?.path || null,
        p_file_name: attachment?.name || null,
        p_file_type: upload?.mime || attachment?.type || null,
      });
      if (result.error) throw result.error;
      setText(""); setRemaining(Number((result.data as { remaining?: number } | null)?.remaining ?? remaining));
      await loadMessages(selected.id); await loadConversations(selected.id);
    } catch (cause) { setError(safeError(cause)); }
    finally { setSending(false); if (fileRef.current) fileRef.current.value = ""; }
  }

  async function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; if (file) await send(undefined, file);
  }

  async function toggleRecording() {
    if (recording) { recorderRef.current?.stop(); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : undefined });
      chunksRef.current = [];
      recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        if (timerRef.current) window.clearInterval(timerRef.current);
        setRecording(false); setRecordingSeconds(0);
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        if (blob.size) void send(undefined, new File([blob], `voice-note-${Date.now()}.webm`, { type: blob.type }));
      };
      recorder.start(); recorderRef.current = recorder; setRecording(true); setRecordingSeconds(0);
      timerRef.current = window.setInterval(() => setRecordingSeconds((value) => value + 1), 1000);
    } catch { setError("Microphone permission was not granted. You can still attach an audio file."); }
  }

  async function openAttachment(message: Message) {
    if (!message.file_path) return;
    const result = await supabase.storage.from("chat-attachments").createSignedUrl(message.file_path, 300);
    if (result.error) return setError(result.error.message);
    setMedia({ url: result.data.signedUrl, name: message.file_name || "Attachment", type: message.file_type || "application/octet-stream" });
  }

  async function toggleBlock() {
    if (!selected) return;
    const result = await supabase.rpc("loadlink_set_conversation_block", { p_conversation_id: selected.id, p_block: !block.blocked_by_me });
    if (result.error) return setError(safeError(result.error));
    setBlock((value) => ({ ...value, blocked_by_me: !value.blocked_by_me }));
  }

  async function submitReport() {
    if (!selected || reportReason.trim().length < 8) return setError("Please explain the problem in at least 8 characters.");
    const result = await supabase.rpc("loadlink_create_moderation_case", { p_entity_type: "conversation", p_entity_id: selected.id, p_reason: reportReason.trim(), p_case_type: "messaging_report", p_evidence: [] });
    if (result.error) return setError(safeError(result.error));
    setReportOpen(false); setReportReason(""); setError("Report submitted to the LoadLink safety team.");
  }

  function exportConversation() {
    if (!selected) return;
    const blob = new Blob([JSON.stringify({ conversation: selected, messages }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const link = document.createElement("a");
    link.href = url; link.download = `loadlink-conversation-${selected.id}.json`; link.click(); URL.revokeObjectURL(url);
  }

  const surface = darkMode ? "border-white/10 bg-[#0b0b0b] text-white" : "border-black/10 bg-white text-black";
  const muted = darkMode ? "text-white/55" : "text-black/55";

  return <main className={`min-h-[100dvh] ${darkMode ? "bg-black text-white" : "bg-[#f4efe3] text-black"}`}>
    <ProfessionalHeader darkMode={darkMode} onToggleTheme={toggleTheme} compact />
    <section className="mx-auto grid h-[calc(100dvh-80px)] max-w-[1500px] md:grid-cols-[360px_1fr]">
      <aside className={`border-r ${surface} ${selectedId ? "hidden md:block" : "block"}`}>
        <div className="border-b border-current/10 p-4"><h1 className="text-3xl font-black">Messages</h1><p className={`mt-1 text-sm ${muted}`}>Signed-in, listing-linked conversations.</p><label className="mt-4 block"><span className="sr-only">Search conversations</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search conversations" className={`h-12 w-full rounded-xl border px-4 font-bold outline-none focus:border-[#f6b800] ${darkMode ? "border-white/15 bg-white/5" : "border-black/10 bg-black/5"}`}/></label></div>
        <div className="h-[calc(100dvh-202px)] overflow-y-auto">
          {loading ? <p className={`p-5 text-sm font-bold ${muted}`}>Loading inbox…</p> : visible.length ? visible.map((item) => <button key={item.id} type="button" onClick={() => setSelectedId(item.id)} className={`grid w-full grid-cols-[48px_1fr_auto] gap-3 border-b border-current/10 p-4 text-left ${selectedId === item.id ? "bg-[#f6b800]/15" : "hover:bg-current/5"}`}><span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f6b800] text-lg font-black text-black">{item.other_name.slice(0,1).toUpperCase()}</span><span className="min-w-0"><strong className="block truncate">{item.other_name}</strong><span className={`block truncate text-xs ${muted}`}>{item.listing_title}</span><span className={`mt-1 block truncate text-xs ${muted}`}>{item.last_message || "Conversation started"}</span></span><span className="text-right text-[10px] font-bold"><span>{formatTime(item.last_message_at)}</span>{Number(item.unread_count || 0) > 0 ? <span className="ml-auto mt-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#f6b800] px-1 text-black">{item.unread_count}</span> : null}</span></button>) : <EmptyState title="No conversations yet" body="Open a listing and choose Message seller to start a secure conversation." actionHref="/vehicles" actionLabel="Browse vehicles" darkMode={darkMode}/>} 
        </div>
      </aside>

      <section className={`${selectedId ? "flex" : "hidden md:flex"} min-w-0 flex-col ${darkMode ? "bg-[#050505]" : "bg-[#f8f5ec]"}`}>
        {selected ? <>
          <header className={`flex min-h-20 items-center gap-3 border-b px-4 ${surface}`}><button type="button" onClick={() => setSelectedId("")} className="flex h-10 w-10 items-center justify-center rounded-full border border-current/15 md:hidden" aria-label="Back to conversations">‹</button><span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#f6b800] font-black text-black">{selected.other_name.slice(0,1).toUpperCase()}</span><div className="min-w-0 flex-1"><h2 className="truncate font-black">{selected.other_name}</h2><p className={`truncate text-xs ${muted}`}>{selected.listing_title} · {activity(selected.other_last_seen)}</p></div><button type="button" onClick={() => setDetailsOpen(true)} className="h-10 rounded-xl border border-current/15 px-4 text-xs font-black uppercase">Details</button></header>
          <div className={`border-b px-4 py-3 text-xs font-bold ${darkMode ? "border-white/10 bg-white/5" : "border-black/10 bg-white"}`}><span className="text-[#b88900]">Listing context:</span> {selected.listing_title} {selected.listing_id ? <Link href={`/jobs?listing=${selected.listing_id}`} className="ml-2 underline">View listing</Link> : null}</div>
          <div className="flex-1 overflow-y-auto px-4 py-5"><div className="mx-auto max-w-3xl space-y-3">
            {messages.map((message) => { const mine = message.sender_id === userId; return <article key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}><div className={`max-w-[84%] rounded-2xl px-4 py-3 text-sm ${mine ? "bg-[#f6b800] text-black" : darkMode ? "bg-white/10 text-white" : "bg-white text-black shadow-sm"}`}>{message.body ? <p className="whitespace-pre-wrap leading-6">{message.body}</p> : null}{message.file_path ? <button type="button" onClick={() => void openAttachment(message)} className="mt-2 flex w-full items-center gap-2 rounded-xl border border-current/20 p-3 text-left font-bold"><span>Attachment</span><span className="min-w-0 truncate">{message.file_name || "Open file"}</span></button> : null}<time className="mt-2 block text-right text-[9px] font-bold opacity-55">{formatTime(message.created_at)}</time></div></article>; })}
            <div ref={bottomRef}/>
          </div></div>
          {error ? <p role="status" className="border-t border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-500">{error}</p> : null}
          {block.blocked_by_me || block.blocked_by_other ? <p className="border-t border-[#f6b800]/30 bg-[#f6b800]/10 px-4 py-3 text-center text-sm font-bold">{block.blocked_by_me ? "You blocked this conversation." : "The other participant blocked this conversation."}</p> : null}
          <div className={`border-t p-3 ${surface}`}><div className="mx-auto max-w-3xl"><div className="mb-2 flex gap-2 overflow-x-auto no-scrollbar">{QUICK_REPLIES.map((reply) => <button key={reply} type="button" onClick={() => setText(reply)} className="shrink-0 rounded-full border border-current/15 px-3 py-2 text-[10px] font-black">{reply}</button>)}</div><form onSubmit={(event) => void send(event)} className="grid grid-cols-[44px_44px_1fr_auto] items-end gap-2"><input ref={fileRef} type="file" className="hidden" onChange={(event) => void chooseFile(event)} accept="image/jpeg,image/png,image/webp,application/pdf,audio/webm,audio/mpeg,video/mp4"/><button type="button" onClick={() => fileRef.current?.click()} disabled={sending || block.blocked_by_me || block.blocked_by_other} className="flex h-11 w-11 items-center justify-center rounded-xl border border-current/15" aria-label="Attach file">＋</button><button type="button" onClick={() => void toggleRecording()} disabled={sending || block.blocked_by_me || block.blocked_by_other} className={`flex h-11 w-11 items-center justify-center rounded-xl border ${recording ? "border-red-500 bg-red-500 text-white" : "border-current/15"}`} aria-label={recording ? "Stop voice note" : "Record voice note"}>{recording ? recordingSeconds : "●"}</button><label><span className="sr-only">Message</span><textarea value={text} onChange={(e) => setText(e.target.value)} rows={1} maxLength={4000} placeholder="Write a message" disabled={block.blocked_by_me || block.blocked_by_other} className={`max-h-32 min-h-11 w-full resize-none rounded-xl border px-4 py-3 outline-none focus:border-[#f6b800] ${darkMode ? "border-white/15 bg-white/5" : "border-black/10 bg-black/5"}`}/></label><button disabled={sending || (!text.trim()) || block.blocked_by_me || block.blocked_by_other || remaining <= 0} className="h-11 rounded-xl bg-[#f6b800] px-5 text-xs font-black uppercase text-black disabled:opacity-40">{sending ? "Sending" : "Send"}</button></form><p className={`mt-2 text-right text-[10px] font-bold ${muted}`}>{remaining > 1000 ? "Unlimited messages" : `${remaining} Standard messages remaining today`}</p></div></div>
        </> : <EmptyState title="Choose a conversation" body="Your secure LoadLink conversations will appear here." actionHref="/vehicles" actionLabel="Browse marketplace" darkMode={darkMode}/>} 
      </section>
    </section>

    <AccessibleDialog open={detailsOpen} onClose={() => setDetailsOpen(false)} title={selected?.other_name || "Conversation details"} description={selected?.listing_title} darkMode={darkMode}><div className="grid gap-3"><button type="button" onClick={() => void toggleBlock()} className="h-12 rounded-xl border border-current/15 font-black">{block.blocked_by_me ? "Unblock participant" : "Block participant"}</button><button type="button" onClick={() => { setDetailsOpen(false); setReportOpen(true); }} className="h-12 rounded-xl border border-red-500/40 font-black text-red-500">Report conversation</button><button type="button" onClick={exportConversation} className="h-12 rounded-xl border border-current/15 font-black">Export conversation data</button></div></AccessibleDialog>
    <AccessibleDialog open={reportOpen} onClose={() => setReportOpen(false)} title="Report this conversation" description="Your report creates a case in the LoadLink moderation queue." darkMode={darkMode}><textarea value={reportReason} onChange={(e) => setReportReason(e.target.value)} className={`min-h-32 w-full rounded-xl border p-4 outline-none focus:border-[#f6b800] ${darkMode ? "border-white/15 bg-white/5" : "border-black/10 bg-black/5"}`} placeholder="Explain what happened"/><button type="button" onClick={() => void submitReport()} className="mt-4 h-12 w-full rounded-xl bg-[#f6b800] font-black text-black">Submit report</button></AccessibleDialog>
    <AccessibleDialog open={Boolean(media)} onClose={() => setMedia(null)} title={media?.name || "Attachment"} darkMode={darkMode} maxWidth="max-w-3xl">{media ? media.type.startsWith("image/") ? <img src={media.url} alt={media.name} className="max-h-[65dvh] w-full object-contain"/> : media.type.startsWith("audio/") ? <audio controls src={media.url} className="w-full"/> : media.type.startsWith("video/") ? <video controls src={media.url} className="max-h-[65dvh] w-full"/> : <div className="grid gap-3"><p className={muted}>This file opens through a short-lived secure link.</p><a href={media.url} target="_blank" rel="noreferrer" className="flex h-12 items-center justify-center rounded-xl bg-[#f6b800] font-black text-black">Open attachment</a></div> : null}</AccessibleDialog>
  </main>;
}
