"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { loginHref } from "@/lib/auth";
import { useLoadLinkAccount } from "@/lib/loadLinkAccountStore";
import LoadLinkGearIcon from "@/components/LoadLinkGearIcon";

export default function AuthStatusButton({ darkMode, className = "" }: { darkMode: boolean; className?: string }) {
  const pathname = usePathname();
  const account = useLoadLinkAccount();
  const base = `relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border transition active:scale-[0.97] ${className}`;

  if (!account.ready) {
    return <span aria-hidden="true" className={`block h-10 w-10 shrink-0 ${className}`} />;
  }

  if (account.user) {
    const email = account.user.email || "your account";
    return (
      <Link
        href="/account/settings"
        aria-label={`Signed in as ${email}. Open profile settings`}
        title={`Signed in as ${email}`}
        className={`${base} border-[#f6b800]/55 bg-black text-[#f6b800] shadow-[0_8px_20px_rgba(0,0,0,.14)]`}
      >
        {account.profile.avatar_url ? (
          <span className="absolute inset-[2px] overflow-hidden rounded-full bg-black">
            <img src={account.profile.avatar_url} alt="" className="h-full w-full rounded-full object-cover" />
          </span>
        ) : <LoadLinkGearIcon />}
      </Link>
    );
  }

  return (
    <Link
      href={loginHref(pathname || "/")}
      aria-label="Log in or sign up"
      title="Log in / Sign up"
      className={`${base} ${darkMode ? "border-yellow-400/60 bg-yellow-400 text-black" : "border-black/10 bg-white text-black shadow-[0_8px_18px_rgba(0,0,0,.08)]"}`}
    >
      <img src="/images/auth-icon.png" alt="" className="h-6 w-6 object-contain" />
    </Link>
  );
}
