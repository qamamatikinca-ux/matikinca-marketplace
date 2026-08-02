import Link from "next/link";

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-[#050505] px-5 py-10 text-white">
      <div className="mx-auto max-w-5xl">
        <header className="border-b border-white/10 pb-6">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#f6b800]">LoadLink Control Centre</p>
          <h1 className="mt-3 text-4xl font-black">Admin workspace</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-white/55">Review protected operations, user access and agreement acceptance from the private LoadLink workspace.</p>
        </header>

        <section className="mt-8 grid gap-4 sm:grid-cols-2">
          <Link href="/admin/nda" className="border border-[#f6b800]/35 bg-[#f6b800]/10 p-6 transition hover:border-[#f6b800]">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#f6b800]">Access protection</p>
            <h2 className="mt-3 text-2xl font-black">NDA and blocked users</h2>
            <p className="mt-2 text-sm leading-6 text-white/55">Publish agreement versions, review acceptances and block, suspend or restore user access.</p>
          </Link>
          <Link href="/admin/verifications" className="border border-white/10 bg-white/[0.04] p-6 transition hover:border-[#f6b800]">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#f6b800]">Review queue</p>
            <h2 className="mt-3 text-2xl font-black">Verification requests</h2>
            <p className="mt-2 text-sm leading-6 text-white/55">Open pending identity and company-document submissions.</p>
          </Link>
          <Link href="/" className="border border-white/10 bg-white p-6 text-black transition hover:border-[#f6b800] sm:col-span-2">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#9a6a00]">Marketplace</p>
            <h2 className="mt-3 text-2xl font-black">Return to LoadLink</h2>
            <p className="mt-2 text-sm leading-6 text-black/55">Open the marketplace after the current access checks have passed.</p>
          </Link>
        </section>
      </div>
    </main>
  );
}
