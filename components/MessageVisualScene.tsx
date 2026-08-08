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

  if (mode === "background") {
    return (
      <div className="loadlink-message-sketch" aria-hidden="true" data-scene={variant}>
        <TruckSketch variant={variant} compact />
        <span className="loadlink-message-route route-one" />
        <span className="loadlink-message-route route-two" />
      </div>
    );
  }

  const inline = mode === "inline";
  return (
    <div className={`loadlink-message-loader ${inline ? "is-inline" : "is-full"} ${darkMode ? "is-dark" : "is-light"}`}>
      <div className="loadlink-message-loader-art" data-scene={variant}>
        <div className="loadlink-loader-skyline" />
        <TruckSketch variant={variant} />
        <div className="loadlink-loader-road"><span /><span /><span /></div>
      </div>
      <div className="loadlink-message-loader-copy">
        <h1>{inline ? "Loading conversation" : scene.name}</h1>
        <span>{scene.note}</span>
      </div>
      <div className="loadlink-loader-dots" aria-hidden="true"><i /><i /><i /></div>
    </div>
  );
}

function TruckSketch({ variant, compact = false }: { variant: number; compact?: boolean }) {
  const scene = SCENES[variant];
  const trailerShape = variant === 5 ? "M77 41h58c9 0 14 8 14 17v15H77Z" : variant === 1 ? "M76 35h72l-10 39H76Z" : "M76 34h73v40H76Z";
  return (
    <svg className={compact ? "loadlink-truck-sketch compact" : "loadlink-truck-sketch"} viewBox="0 0 190 100" role="img" aria-label={`${scene.name} truck sketch`}>
      <g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d={trailerShape} />
        <path d="M24 48h36l12 13v13H19V57l5-9Z" />
        <path d="M31 52h22l8 9H31Z" />
        <path d="M20 74h135" />
        <circle cx="42" cy="78" r="8" /><circle cx="64" cy="78" r="8" /><circle cx="103" cy="78" r="8" /><circle cx="135" cy="78" r="8" />
        <path d="M9 86h163M17 91h144" strokeDasharray="8 7" />
        {variant % 2 === 0 ? <path d="M88 44h47M88 51h38M88 58h44" opacity=".7" /> : <path d="M88 47l13-7 13 7 13-7 13 7" opacity=".7" />}
        {variant === 4 ? <path d="M93 34v-8h12v8m18 0v-13h12v13" /> : null}
        {variant === 3 ? <path d="M93 34v-9m14 9V22m14 12V25m14 9V20" /> : null}
        <path d="M154 28c8-8 14-8 22-2M157 35c6-5 10-5 16-2" opacity=".55" />
      </g>
      <text x="88" y="68" className="loadlink-truck-label">{scene.cargo}</text>
    </svg>
  );
}
