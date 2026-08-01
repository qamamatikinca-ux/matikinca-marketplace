import Link from "next/link";
import HomeLogoLink from "@/components/HomeLogoLink";

const groups = [
  { title: "Marketplace", links: [["Work", "/jobs"], ["Contracts", "/contracts"], ["Vehicles", "/vehicles"], ["Drivers", "/drivers"], ["Dealerships", "/dealerships"]] },
  { title: "Account", links: [["Account hub", "/account"], ["My posts", "/my-posts"], ["Messages", "/messages"], ["Verification", "/verification-status"], ["Packages", "/packages"]] },
  { title: "LoadLink", links: [["About", "/about"], ["Contact", "/contact"], ["Safety", "/safety"], ["Business support", "/business-support"], ["Feedback", "/feedback"]] },
  { title: "Legal", links: [["Terms", "/terms"], ["Privacy", "/privacy"], ["Help centre", "/help"]] },
] as const;

export default function ProfessionalFooter({ darkMode }: { darkMode: boolean }) {
  return (
    <footer className={`border-t px-5 py-12 ${darkMode ? "border-white/10 bg-black text-white" : "border-black/10 bg-white text-black"}`}>
      <div className="mx-auto max-w-7xl">
        <div className="flex justify-center"><HomeLogoLink theme={darkMode ? "dark" : "light"} /></div>
        <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {groups.map((group) => <section key={group.title}><h2 className="text-xs font-black uppercase tracking-[.18em] text-[#b88900]">{group.title}</h2><div className="mt-4 grid gap-3">{group.links.map(([label, href]) => <Link key={href} href={href} className={`text-sm font-bold ${darkMode ? "text-white/65 hover:text-white" : "text-black/60 hover:text-black"}`}>{label}</Link>)}</div></section>)}
        </div>
        <p className={`mt-12 border-t pt-6 text-xs leading-6 ${darkMode ? "border-white/10 text-white/45" : "border-black/10 text-black/45"}`}>LoadLink connects South African logistics businesses, truck and mobile-unit owners, dealerships, drivers and work opportunities. Verify people, vehicles, routes, rates and payment terms before committing.</p>
      </div>
    </footer>
  );
}
