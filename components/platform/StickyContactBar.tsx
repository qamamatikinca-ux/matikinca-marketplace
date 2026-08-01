import Link from "next/link";

function cleanPhone(value?: string | null) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";
  return digits.startsWith("0") ? `27${digits.slice(1)}` : digits;
}

export default function StickyContactBar({ listingId, title, phone, whatsapp, darkMode }: { listingId: string; title: string; phone?: string | null; whatsapp?: string | null; darkMode: boolean }) {
  const call = cleanPhone(phone);
  const wa = cleanPhone(whatsapp || phone);
  return <div className={`fixed inset-x-0 bottom-0 z-40 border-t px-3 pb-[max(10px,env(safe-area-inset-bottom))] pt-2 shadow-[0_-14px_35px_rgba(0,0,0,.18)] md:hidden ${darkMode ? "border-white/10 bg-black/95" : "border-black/10 bg-white/95"}`}><div className="mx-auto grid max-w-xl grid-cols-3 gap-2">{call ? <a href={`tel:+${call}`} className="flex h-12 items-center justify-center rounded-xl border border-current/15 text-xs font-black uppercase">Call</a> : <span className="flex h-12 items-center justify-center rounded-xl border border-current/10 text-xs font-black uppercase opacity-40">Call</span>}<Link href={`/messages?listing=${listingId}`} className="flex h-12 items-center justify-center rounded-xl bg-[#f6b800] text-xs font-black uppercase text-black">Message</Link>{wa ? <a href={`https://wa.me/${wa}?text=${encodeURIComponent(`Hi, I am enquiring about ${title} on LoadLink.`)}`} target="_blank" rel="noreferrer" className="flex h-12 items-center justify-center rounded-xl border border-[#f6b800] text-xs font-black uppercase text-[#b88900]">WhatsApp</a> : <span className="flex h-12 items-center justify-center rounded-xl border border-current/10 text-xs font-black uppercase opacity-40">WhatsApp</span>}</div></div>;
}
