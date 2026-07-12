"use client";

import Link from "next/link";

export default function ChatLauncher() {
  return (
    <Link
      href="/messages"
      aria-label="Open messages"
      className="fixed bottom-[5.5rem] right-5 z-[69] flex h-14 w-14 items-center justify-center rounded-full border border-[#f6b800] bg-black text-[#f6b800] shadow-2xl"
    >
      <MessageBubbleIcon />
    </Link>
  );
}

function MessageBubbleIcon() {
  return (
    <svg width="23" height="23" viewBox="0 0 24 24" fill="none">
      <path d="M5 4h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-5 3v-3.7A2 2 0 0 1 3 14.6V6a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M7 9h10M7 12h7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
