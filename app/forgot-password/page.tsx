"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import HomeLogoLink from "@/components/HomeLogoLink";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    if (!isSupabaseConfigured) {
      setMessage("Supabase is not connected yet.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });
    setBusy(false);
    setMessage(error ? error.message : "Password reset instructions were sent to your email.");
  }

  return (
    <main className="min-h-screen bg-[#050505] px-5 py-8 text-white">
      <div className="mx-auto max-w-md">
        <HomeLogoLink className="flex justify-center" />
        <section className="mt-8 border border-[#f6b800]/35 bg-[#0b0b0b] p-6">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#f6b800]">Account recovery</p>
          <h1 className="mt-3 text-3xl font-black">Reset your password</h1>
          <form onSubmit={submit} className="mt-6 grid gap-4">
            <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email address" className="h-12 border border-white/15 bg-white px-4 font-bold text-black outline-none" />
            <button disabled={busy} className="h-12 border border-[#f6b800] bg-[#f6b800] font-black text-black disabled:opacity-50">{busy ? "Sending" : "Send reset email"}</button>
          </form>
          {message ? <p className="mt-4 border border-white/10 p-3 text-sm font-semibold text-white/70">{message}</p> : null}
          <Link href="/login" className="mt-5 inline-block text-sm font-black text-[#f6b800]">Return to sign in</Link>
        </section>
      </div>
    </main>
  );
}
