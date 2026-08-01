import Link from "next/link";

export default function EmptyState({ title, body, actionLabel, actionHref, darkMode }: { title: string; body: string; actionLabel?: string; actionHref?: string; darkMode: boolean }) {
  return <section className={`rounded-[24px] border p-8 text-center ${darkMode ? "border-white/10 bg-[#0b0b0b]" : "border-black/10 bg-white"}`}><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#f6b800] text-xl font-black text-black" aria-hidden="true">↗</div><h2 className="mt-4 text-2xl font-black">{title}</h2><p className={`mx-auto mt-2 max-w-lg text-sm leading-7 ${darkMode ? "text-white/55" : "text-black/55"}`}>{body}</p>{actionLabel && actionHref ? <Link href={actionHref} className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-[#f6b800] px-5 text-xs font-black uppercase text-black">{actionLabel}</Link> : null}</section>;
}
