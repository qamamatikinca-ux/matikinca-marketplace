export default function AdminLoading() {
  return (
    <main className="grid min-h-screen place-items-center bg-black px-5 text-white">
      <div className="text-center">
        <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-white/20 border-t-[#f6b800]" />
        <p className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-[#f6b800]">
          Opening admin tools
        </p>
      </div>
    </main>
  );
}
