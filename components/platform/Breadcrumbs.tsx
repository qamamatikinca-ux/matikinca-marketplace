import Link from "next/link";

export type BreadcrumbItem = { label: string; href?: string };

export default function Breadcrumbs({ items, darkMode }: { items: BreadcrumbItem[]; darkMode: boolean }) {
  return <nav aria-label="Breadcrumb" className={`text-xs font-bold ${darkMode ? "text-white/50" : "text-black/50"}`}><ol className="flex flex-wrap items-center gap-2">{items.map((item, index) => <li key={`${item.label}-${index}`} className="flex items-center gap-2">{index ? <span aria-hidden="true">/</span> : null}{item.href ? <Link href={item.href} className="hover:text-[#b88900]">{item.label}</Link> : <span aria-current="page">{item.label}</span>}</li>)}</ol></nav>;
}
