"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { loginHref } from "@/lib/auth";
import { useLoadLinkAccount } from "@/lib/loadLinkAccountStore";
import { useUnreadMessages } from "@/lib/useUnreadMessages";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

export default function ChatLauncher() {
  const pathname = usePathname();
  const account = useLoadLinkAccount();
  const { darkMode } = useLoadLinkTheme();
  const signedIn = Boolean(account.user);
  const { unread } = useUnreadMessages(signedIn);

  const dealerWorkspace = pathname === "/dealer" || pathname.startsWith("/dealer/") || pathname.startsWith("/dealer-dashboard");
  if (pathname.startsWith("/messages") || pathname.startsWith("/login") || pathname.startsWith("/list-your-vehicle") || pathname.startsWith("/list-your-truck") || dealerWorkspace || !account.ready) return null;

  const href = signedIn ? "/messages" : loginHref("/messages");
  const launcherTheme = darkMode
    ? "border-white/12 bg-[#151515] text-white shadow-[0_16px_42px_rgba(0,0,0,.38)]"
    : "border-black/10 bg-white text-black shadow-[0_14px_36px_rgba(52,38,10,.18)]";

  return (
    <Link
      data-loadlink-chat-launcher="true"
      href={href}
      aria-label={signedIn ? unread ? `Open messages, ${unread} unread` : "Open messages" : "Sign in to open messages"}
      title={signedIn ? "Messages" : "Sign in to message"}
      className={`fixed bottom-[5.5rem] right-5 z-[69] flex h-14 w-14 items-center justify-center rounded-full border backdrop-blur-xl transition active:scale-95 ${launcherTheme}`}
    >
      <MessageBubbleIcon />
      {signedIn && unread > 0 ? <span className={`absolute -right-1.5 -top-1.5 flex h-6 min-w-6 items-center justify-center rounded-full border-2 bg-[#f6b800] px-1 text-[10px] font-black text-black shadow-lg ${darkMode ? "border-[#151515]" : "border-white"}`}>{unread > 99 ? "99+" : unread}</span> : null}
    </Link>
  );
}

function MessageBubbleIcon() {
  return <svg width="23" height="23" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 4h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-5 3v-3.7A2 2 0 0 1 3 14.6V6a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><path d="M7 9h10M7 12h7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
}
