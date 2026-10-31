"use client";

import Link from "next/link";
import styles from "./PlanNavigation.module.css";

type PlanView = "overview" | "packages" | "history";

const views: Array<{ value: PlanView; label: string; href: string }> = [
  { value: "overview", label: "Overview", href: "/packages/manage" },
  { value: "packages", label: "Packages", href: "/packages" },
  { value: "history", label: "Billing history", href: "/account/packages" },
];

export default function PlanNavigation({ active }: { active: PlanView }) {
  return (
    <nav className={styles.tabs} aria-label="Plan and billing navigation">
      {views.map((item) => (
        <Link
          key={item.value}
          href={item.href}
          aria-current={active === item.value ? "page" : undefined}
          className={styles.tab}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
