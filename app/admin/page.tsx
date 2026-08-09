import Link from "next/link";

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-[#f5f5f0] px-5 py-10 text-black">
      <div className="mx-auto max-w-5xl">
        <header className="border-b border-black/10 pb-6">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#9a6a00]">LoadLink administration</p>
          <h1 className="mt-3 text-4xl font-black">Admin workspace</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-black/60">Review verification requests and manage protected LoadLink operations from this workspace.</p>
        </header>

        <section className="mt-8 grid gap-4 sm:grid-cols-2">
          <Link href="/admin/verifications" className="border border-black/10 bg-white p-6 transition hover:border-[#f6b800]">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#9a6a00]">Review queue</p>
            <h2 className="mt-3 text-2xl font-black">Verification requests</h2>
            <p className="mt-2 text-sm leading-6 text-black/55">Open pending identity and company-document submissions.</p>
          </Link>
          <Link href="/admin/package-requests" className="border border-black/10 bg-white p-6 transition hover:border-[#f6b800]"><p className="text-xs font-black uppercase tracking-[0.16em] text-[#9a6a00]">Revenue</p><h2 className="mt-3 text-2xl font-black">Tailored package requests</h2><p className="mt-2 text-sm leading-6 text-black/55">Approve, reject or adjust LoadLink Plan Guide custom pricing requests.</p></Link>
          <Link href="/" className="border border-black/10 bg-black p-6 text-white transition hover:border-[#f6b800]">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#f6b800]">Marketplace</p>
            <h2 className="mt-3 text-2xl font-black">Return to LoadLink</h2>
            <p className="mt-2 text-sm leading-6 text-white/55">Open the public website without loading admin-only tools.</p>
          </Link>
        </section>
      </div>
    </main>
  );
}
