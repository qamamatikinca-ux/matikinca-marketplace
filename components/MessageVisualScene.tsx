"use client";

import { useEffect, useState } from "react";

type Mode = "loading" | "inline" | "background";

const SCENES = [
  { name: "Line-haul convoy", cargo: "BOX", note: "Connecting verified logistics opportunities" },
  { name: "Side-tipper route", cargo: "TIPPER", note: "Checking your latest conversations" },
  { name: "Cold-chain run", cargo: "FRIDGE", note: "Keeping your private messages in sync" },
  { name: "Mobile kitchen dispatch", cargo: "KITCHEN", note: "Preparing your LoadLink inbox" },
  { name: "Mining fleet", cargo: "MINING", note: "Loading messages from the network" },
  { name: "Tanker route", cargo: "TANKER", note: "Securing your conversation history" },
  { name: "Flatbed delivery", cargo: "FLATBED", note: "Bringing your contacts together" },
  { name: "Livestock transport", cargo: "LIVESTOCK", note: "Updating your active conversations" },
  { name: "Container movement", cargo: "CONTAINER", note: "Routing messages across LoadLink" },
  { name: "Local delivery", cargo: "LOCAL", note: "Getting your inbox road-ready" },
] as const;

function chooseScene() {
  if (typeof window === "undefined") return 0;
  const sessionKey = "loadlink-message-scene-session-v2";
  const stored = Number(window.sessionStorage.getItem(sessionKey));
  if (Number.isInteger(stored) && stored >= 0 && stored < SCENES.length) return stored;
  const last = Number(window.localStorage.getItem("loadlink-message-scene-last-v2"));
  const seed = crypto.getRandomValues(new Uint32Array(1))[0];
  let next = seed % SCENES.length;
  if (Number.isInteger(last) && next === last) next = (next + 1 + (seed % 8)) % SCENES.length;
  window.sessionStorage.setItem(sessionKey, String(next));
  window.localStorage.setItem("loadlink-message-scene-last-v2", String(next));
  return next;
}

export default function MessageVisualScene({ mode, darkMode }: { mode: Mode; darkMode: boolean }) {
  const [variant, setVariant] = useState(0);
  useEffect(() => setVariant(chooseScene()), []);
  const scene = SCENES[variant];

  if (mode === "background") return null;

  const inline = mode === "inline";
  return (
    <div className={`flex ${inline ? "min-h-[260px]" : "min-h-[100dvh]"} w-full items-center justify-center px-5 py-8 ${darkMode ? "bg-black text-white" : "bg-[#f4efe3] text-black"}`}>
      <div className={`w-full ${inline ? "max-w-xl" : "max-w-[760px]"} text-center`}>
        <div className={`relative mx-auto overflow-hidden border ${inline ? "aspect-[1.75/1]" : "aspect-[1.5/1] sm:aspect-[1.75/1]"} ${darkMode ? "border-[#f6b800]/50 bg-[#0d0d0d]" : "border-[#e6bd4d] bg-[#f7f1e3]"}`}>
          <div className={`absolute inset-x-0 bottom-[22%] h-[30%] opacity-70 ${darkMode ? "text-white/10" : "text-black/12"}`} aria-hidden="true">
            <svg viewBox="0 0 800 180" className="h-full w-full" preserveAspectRatio="none">
              <path fill="currentColor" d="M0 180V90h65V10h28v170h32V55h44v125h40V110h54V40h36v140h50V78h61v102h45V120h58V65h30v115h46V95h75v85h45V52h42v128h69v-40h50v40Z" />
            </svg>
          </div>
          <div className="absolute inset-x-[8%] top-[17%] bottom-[18%] text-[#f6b800]">
            <TruckSketch variant={variant} />
          </div>
          <div className={`absolute inset-x-0 bottom-0 border-t ${darkMode ? "border-[#f6b800]/35" : "border-[#e6bd4d]"}`} />
          <div className="absolute bottom-[9%] left-[17%] h-1 w-[26%] overflow-hidden bg-[#f6b800]/25"><span className="block h-full w-[58%] bg-[#f6b800] animate-pulse" /></div>
        </div>

        <div className={inline ? "mt-5" : "mt-8"}>
          {!inline ? <p className={`text-[10px] font-black uppercase tracking-[.24em] ${darkMode ? "text-[#f6b800]" : "text-[#9b7600]"}`}>LoadLink Messages</p> : null}
          <h1 className={`${inline ? "text-xl" : "text-3xl sm:text-4xl"} mt-2 font-black tracking-[-.045em]`}>{inline ? "Loading conversation" : scene.name}</h1>
          <p className={`mx-auto mt-3 max-w-xl ${inline ? "text-xs" : "text-sm sm:text-base"} font-semibold leading-6 ${darkMode ? "text-white/55" : "text-black/52"}`}>{scene.note}</p>
          <div className="mt-5 flex items-center justify-center gap-2" aria-hidden="true">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#f6b800]" />
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#f6b800]/70 [animation-delay:160ms]" />
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#f6b800]/40 [animation-delay:320ms]" />
          </div>
        </div>
      </div>
    </div>
  );
}

function TruckSketch({ variant }: { variant: number }) {
  const scene = SCENES[variant];
  const trailerShape = variant === 5 ? "M77 41h58c9 0 14 8 14 17v15H77Z" : variant === 1 ? "M76 35h72l-10 39H76Z" : "M76 34h73v40H76Z";
  return (
    <svg className="h-full w-full" viewBox="0 0 190 100" role="img" aria-label={`${scene.name} truck sketch`}>
      <g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d={trailerShape} />
        <path d="M24 48h36l12 13v13H19V57l5-9Z" />
        <path d="M31 52h22l8 9H31Z" />
        <path d="M20 74h135" />
        <circle cx="42" cy="78" r="8" /><circle cx="64" cy="78" r="8" /><circle cx="103" cy="78" r="8" /><circle cx="135" cy="78" r="8" />
        <path d="M9 86h163M17 91h144" strokeDasharray="8 7" />
        {variant % 2 === 0 ? <path d="M88 44h47M88 51h38M88 58h44" opacity=".72" /> : <path d="M88 47l13-7 13 7 13-7 13 7" opacity=".72" />}
        <path d="M154 28c8-8 14-8 22-2M157 35c6-5 10-5 16-2" opacity=".55" />
      </g>
      <text x="88" y="68" fill="currentColor" fontSize="8" letterSpacing="1.2">{scene.cargo}</text>
    </svg>
  );
}
