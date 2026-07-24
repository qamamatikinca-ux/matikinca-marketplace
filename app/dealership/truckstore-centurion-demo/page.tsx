import Link from "next/link";
import HomeLogoLink from "@/components/HomeLogoLink";

const inventory = [
  { title: "Mercedes-Benz Actros 2645", year: "2023", price: "R1 695 000", mileage: "188 000 km", image: "/images/truck-1.jpg" },
  { title: "Volvo FH 440 Globetrotter", year: "2022", price: "Request a quote", mileage: "247 000 km", image: "/images/truck-2.jpg" },
  { title: "Scania R-series 460", year: "2021", price: "R1 250 000", mileage: "315 000 km", image: "/images/truck-3.jpg" },
  { title: "MAN TGS 26.440", year: "2020", price: "R985 000", mileage: "402 000 km", image: "/images/jobs/job-card-1.jpg" },
  { title: "Mercedes-Benz Axor 3340", year: "2019", price: "R875 000", mileage: "466 000 km", image: "/images/jobs/jobs-hero-fleet.jpg" },
  { title: "DAF XF 480", year: "2022", price: "R1 420 000", mileage: "271 000 km", image: "/images/contracts-1.jpg" },
];

export default function DealerDemoPage() {
  return (
    <main className="min-h-screen bg-[#f3f0e8] text-black">
      <header className="sticky top-0 z-50 border-b border-black/10 bg-white">
        <div className="grid h-20 grid-cols-[80px_1fr_120px] items-center px-4">
          <Link href="/list-your-truck" className="text-xs font-black uppercase tracking-wide">Back</Link>
          <HomeLogoLink theme="light" />
          <Link href="/dealer-dashboard" className="justify-self-end rounded-xl bg-black px-4 py-2 text-[10px] font-black uppercase tracking-wide text-[#f6b800]">Dashboard</Link>
        </div>
      </header>

      <section className="relative overflow-hidden bg-black text-white">
        <img src="/images/jobs/jobs-hero-fleet.jpg" alt="Commercial dealership inventory" className="absolute inset-0 h-full w-full object-cover opacity-45" />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/85 to-black/20" />
        <div className="relative mx-auto max-w-7xl px-5 py-16 md:px-8 md:py-24">
          <span className="inline-flex rounded-full bg-[#f6b800] px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-black">Dealer package demonstration</span>
          <h1 className="mt-5 max-w-3xl text-5xl font-black tracking-[-0.06em] md:text-7xl">Centurion Commercial Truck Centre</h1>
          <p className="mt-4 max-w-2xl text-base font-semibold leading-7 text-white/65">This is a LoadLink example showing how an approved dealership page could look after purchasing the Dealer package. It is not presented as an official subscription by the referenced business.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <button className="rounded-xl bg-[#f6b800] px-6 py-3 text-xs font-black uppercase tracking-[0.12em] text-black">Follow dealership</button>
            <button className="rounded-xl border border-white/25 bg-white/5 px-6 py-3 text-xs font-black uppercase tracking-[0.12em]">Message sales team</button>
          </div>
        </div>
      </section>

      <section className="border-b border-black/10 bg-white px-5 py-7 md:px-8">
        <div className="mx-auto grid max-w-7xl gap-5 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-3"><h2 className="text-3xl font-black tracking-[-0.04em]">Verified dealership profile</h2><span className="rounded-full bg-[#f6b800]/20 px-3 py-1 text-[10px] font-black uppercase text-[#8a6500]">Dealer</span></div>
            <p className="mt-2 text-sm leading-6 text-black/55">Centurion, Gauteng · Commercial vehicles · Nationwide enquiries</p>
          </div>
          <div className="grid grid-cols-3 gap-5 text-center">
            <div><strong className="block text-2xl font-black">48</strong><span className="text-[10px] font-black uppercase text-black/40">Vehicles</span></div>
            <div><strong className="block text-2xl font-black">1.8k</strong><span className="text-[10px] font-black uppercase text-black/40">Followers</span></div>
            <div><strong className="block text-2xl font-black">12 min</strong><span className="text-[10px] font-black uppercase text-black/40">Reply time</span></div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10 md:px-8 md:py-14">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#9d7300]">Available stock</p><h2 className="mt-2 text-4xl font-black tracking-[-0.045em]">Dealer inventory</h2></div>
          <div className="flex gap-2"><button className="rounded-xl border border-black/10 bg-white px-4 py-2 text-xs font-black">All trucks</button><button className="rounded-xl border border-black/10 bg-white px-4 py-2 text-xs font-black">Newest first</button></div>
        </div>
        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {inventory.map((truck) => (
            <article key={truck.title} className="overflow-hidden rounded-[24px] border border-black/10 bg-white shadow-[0_15px_45px_rgba(0,0,0,.07)]">
              <div className="relative aspect-[4/3] overflow-hidden bg-black/5"><img src={truck.image} alt={truck.title} className="h-full w-full object-cover" /><span className="absolute left-3 top-3 rounded-full bg-[#f6b800] px-3 py-1 text-[9px] font-black uppercase text-black">Dealer stock</span></div>
              <div className="p-5"><p className="text-[10px] font-black uppercase tracking-[0.14em] text-black/40">{truck.year} · {truck.mileage}</p><h3 className="mt-2 text-xl font-black tracking-[-0.03em]">{truck.title}</h3><p className="mt-4 text-2xl font-black text-[#9d7300]">{truck.price}</p><button className="mt-5 h-11 w-full rounded-xl bg-black text-xs font-black uppercase tracking-[0.12em] text-[#f6b800]">Enquire about vehicle</button></div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
