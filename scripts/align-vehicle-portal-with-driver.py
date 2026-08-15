from pathlib import Path

path = Path("app/list-your-vehicle/page.tsx")
text = path.read_text(encoding="utf-8")

old = '''      <section className="relative min-h-[300px] overflow-hidden border-b border-[#f6b800]/35 md:min-h-[360px]">
        <img src="/images/jobs/jobs-hero-fleet.jpg" alt="Commercial vehicles ready to be listed on LoadLink" className="absolute inset-0 h-full w-full scale-[1.03] object-cover object-center grayscale opacity-80 [mask-image:linear-gradient(to_bottom,black_0%,black_64%,transparent_100%)]" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/65 to-black/35 [mask-image:linear-gradient(to_bottom,black_0%,black_70%,transparent_100%)]" />
        <div className="relative mx-auto flex min-h-[300px] max-w-5xl flex-col justify-end px-5 pb-9 pt-20 text-white md:min-h-[360px]">
          <h1 className="max-w-3xl text-5xl font-black leading-[0.94] tracking-[-0.06em] md:text-7xl">{dealerPost ? `Add stock to ${dealershipName}` : "Find a vehicle or list your own"}</h1>
          <p className="mt-4 max-w-xl text-base font-semibold leading-7 text-white/75">Browse approved trucks, trailers and mobile units, or open the listing flow when you are ready to add your own.</p>
        </div>
      </section>

      <section className={`border-b px-4 py-5 md:px-6 ${darkMode ? "border-white/10 bg-[#080808]" : "border-black/10 bg-white/80"}`}>
        <div className="mx-auto grid max-w-5xl gap-3 sm:grid-cols-3">
          <button type="button" onClick={() => { setListingFlowOpen(true); window.requestAnimationFrame(() => document.getElementById("vehicle-listing-form")?.scrollIntoView({ behavior: "smooth", block: "start" })); }} className="flex min-h-16 items-center justify-center rounded-2xl bg-[#f6b800] px-5 text-center text-sm font-black text-black">List your vehicle</button>
          <a href="#vehicle-marketplace-vehicles" onClick={() => setListingFlowOpen(false)} className={`loadlink-glass flex min-h-16 items-center justify-center rounded-2xl border px-5 text-center text-sm font-black ${darkMode ? "border-white/12 bg-white/[.04]" : "border-black/8 bg-white/70"}`}>Vehicles available</a>
          <a href="#vehicle-marketplace-units" onClick={() => setListingFlowOpen(false)} className={`loadlink-glass flex min-h-16 items-center justify-center rounded-2xl border px-5 text-center text-sm font-black ${darkMode ? "border-white/12 bg-white/[.04]" : "border-black/8 bg-white/70"}`}>Units available</a>
        </div>
      </section>'''

new = '''      <section className="relative min-h-[520px] overflow-hidden md:min-h-[620px]">
        <img
          src="/images/jobs/jobs-hero-fleet.jpg"
          alt="Approved LoadLink commercial vehicles and mobile units"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/45 to-black/90" />

        <div className="relative mx-auto flex min-h-[520px] max-w-6xl flex-col justify-end px-5 pb-8 pt-24 text-center text-white md:min-h-[620px] md:pb-12">
          <h1 className="mx-auto max-w-4xl text-5xl font-black tracking-[-.055em] md:text-7xl">
            {dealerPost ? `Add stock to ${dealershipName}` : "Find a vehicle or list your own"}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm font-semibold leading-7 text-white/75 md:text-base">
            Browse approved trucks, trailers and mobile units, or create your own verified LoadLink listing.
          </p>

          {!dealerPost ? (
            <div className="mx-auto mt-6 grid w-full max-w-md gap-3">
              <button
                type="button"
                onClick={() => {
                  setListingFlowOpen(true);
                  window.setTimeout(() => document.getElementById("vehicle-listing-form")?.scrollIntoView({ behavior: "smooth", block: "start" }), 40);
                }}
                className="flex min-h-14 items-center justify-center rounded-full bg-[#f6b800] px-6 text-sm font-black uppercase tracking-[.1em] text-black shadow-[0_12px_32px_rgba(0,0,0,.28)] transition active:scale-[.99]"
              >
                List your vehicle
              </button>
              <a
                href="#vehicle-marketplace-vehicles"
                onClick={() => setListingFlowOpen(false)}
                className="flex min-h-14 items-center justify-center rounded-full border border-white/55 bg-black/80 px-6 text-sm font-black uppercase tracking-[.1em] text-white shadow-[0_12px_32px_rgba(0,0,0,.24)] backdrop-blur transition active:scale-[.99]"
              >
                Vehicles available
              </a>
              <a
                href="#vehicle-marketplace-units"
                onClick={() => setListingFlowOpen(false)}
                className="flex min-h-14 items-center justify-center rounded-full border border-white/55 bg-black/80 px-6 text-sm font-black uppercase tracking-[.1em] text-white shadow-[0_12px_32px_rgba(0,0,0,.24)] backdrop-blur transition active:scale-[.99]"
              >
                Units available
              </a>
            </div>
          ) : null}
        </div>
      </section>'''

if old not in text:
    raise SystemExit("Expected vehicle portal hero/options block was not found.")

path.write_text(text.replace(old, new, 1), encoding="utf-8")
print("Vehicle portal now follows the Driver Portal landing structure.")
