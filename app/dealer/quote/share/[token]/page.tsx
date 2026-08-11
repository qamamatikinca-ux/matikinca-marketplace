"use client";

import LoadLinkSiteHeader from "@/components/LoadLinkSiteHeader";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import HomeLogoLink from "@/components/HomeLogoLink";
import LoadLinkThemeToggle from "@/components/LoadLinkThemeToggle";
import { supabase } from "@/lib/supabaseClient";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

type Quote = {
  quote_number: string;
  status: string;
  created_at: string;
  expires_at?: string | null;
  dealership_name: string;
  dealership_logo?: string | null;
  dealership_location?: string | null;
  dealership_phone?: string | null;
  dealership_email?: string | null;
  customer_name?: string | null;
  vehicle_title?: string | null;
  vehicle_price: number;
  fees_amount: number;
  extras_amount: number;
  trade_in_amount: number;
  total_amount: number;
  notes?: string | null;
  sales_name?: string | null;
  vehicle_url?: string | null;
};

function zar(value: number | null | undefined) {
  return new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 0 }).format(Number(value || 0));
}

export default function SharedDealerQuotePage() {
  const params = useParams<{ token: string }>();
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const token = decodeURIComponent(String(params.token || ""));
        const { data, error: rpcError } = await supabase.rpc("loadlink_public_dealer_quote", { p_token: token });
        if (rpcError) throw rpcError;
        if (active) setQuote((data || null) as Quote | null);
      } catch {
        if (active) setError("This quote is unavailable or has expired.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [params.token]);

  const bg = darkMode ? "bg-[#090909] text-white" : "bg-[#f6f3ec] text-[#111]";
  const paper = darkMode ? "border-white/12 bg-[#111]" : "border-black/10 bg-white";

  return <main className={`min-h-screen ${bg}`}>
    <LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme} sticky={false} />
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
      {loading ? <div className={`border p-6 ${paper}`}><div className="h-5 w-40 animate-pulse bg-current opacity-10" /><div className="mt-5 h-28 animate-pulse bg-current opacity-[.06]" /></div> : error || !quote ? <div className={`border p-6 sm:p-8 ${paper}`}><h1 className="text-2xl font-black">Quote unavailable</h1><p className="mt-2 text-sm opacity-60">{error || "The secure quote link can no longer be opened."}</p><Link href="/" className="mt-5 inline-flex min-h-11 items-center bg-black px-5 text-sm font-black text-white dark:bg-white dark:text-black">Open LoadLink</Link></div> : <article className={`border ${paper}`}>
        <div className="border-b border-current/10 px-5 py-5 sm:px-8 sm:py-7">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="flex min-w-0 items-center gap-4">{quote.dealership_logo ? <img src={quote.dealership_logo} alt="" className="h-14 w-14 shrink-0 border border-current/10 object-cover" /> : <div className="grid h-14 w-14 shrink-0 place-items-center border border-current/10 text-lg font-black">LL</div>}<div className="min-w-0"><h1 className="truncate text-xl font-black sm:text-2xl">{quote.dealership_name}</h1><p className="mt-1 text-sm opacity-55">Vehicle quote · {quote.quote_number}</p></div></div>
            <div className="text-left sm:text-right"><div className="text-xs font-black uppercase tracking-[.12em] opacity-45">Total</div><div className="mt-1 text-2xl font-black">{zar(quote.total_amount)}</div></div>
          </div>
        </div>
        <div className="grid gap-7 px-5 py-6 sm:px-8 sm:py-8">
          <section><div className="text-xs font-black uppercase tracking-[.12em] opacity-45">Prepared for</div><div className="mt-2 text-lg font-black">{quote.customer_name || "Customer"}</div>{quote.sales_name ? <p className="mt-1 text-sm opacity-60">Sales consultant: {quote.sales_name}</p> : null}</section>
          <section className="border-y border-current/10 py-5"><div className="text-xs font-black uppercase tracking-[.12em] opacity-45">Vehicle</div><div className="mt-2 text-xl font-black">{quote.vehicle_title || "Vehicle"}</div>{quote.vehicle_url ? <Link href={quote.vehicle_url} className="mt-3 inline-flex text-sm font-black underline underline-offset-4">View vehicle on LoadLink</Link> : null}</section>
          <section className="grid gap-2 text-sm"><Line label="Vehicle" value={zar(quote.vehicle_price)} /><Line label="Fees" value={zar(quote.fees_amount)} /><Line label="Extras" value={zar(quote.extras_amount)} />{Number(quote.trade_in_amount) > 0 ? <Line label="Trade-in allowance" value={`− ${zar(quote.trade_in_amount)}`} /> : null}<div className="mt-2 flex items-center justify-between border-t border-current/10 pt-4 text-lg font-black"><span>Total</span><span>{zar(quote.total_amount)}</span></div></section>
          {quote.notes ? <section><div className="text-xs font-black uppercase tracking-[.12em] opacity-45">Notes</div><p className="mt-2 whitespace-pre-wrap text-sm leading-6 opacity-75">{quote.notes}</p></section> : null}
          <section className="grid gap-1 border-t border-current/10 pt-5 text-xs opacity-55"><div>Created {new Date(quote.created_at).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" })}</div>{quote.expires_at ? <div>Valid until {new Date(quote.expires_at).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" })}</div> : null}{quote.dealership_location ? <div>{quote.dealership_location}</div> : null}</section>
          <div className="flex flex-wrap gap-2">{quote.dealership_phone ? <a href={`tel:${quote.dealership_phone}`} className="inline-flex min-h-11 items-center bg-black px-5 text-sm font-black text-white dark:bg-white dark:text-black">Call dealership</a> : null}{quote.dealership_email ? <a href={`mailto:${quote.dealership_email}`} className="inline-flex min-h-11 items-center border border-current/20 px-5 text-sm font-black">Email dealership</a> : null}</div>
        </div>
      </article>}
    </div>
  </main>;
}

function Line({ label, value }: { label: string; value: string }) { return <div className="flex items-center justify-between gap-4"><span className="opacity-60">{label}</span><span className="font-black">{value}</span></div>; }
