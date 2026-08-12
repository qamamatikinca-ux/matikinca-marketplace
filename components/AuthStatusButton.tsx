"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { loginHref } from "@/lib/auth";
import { useLoadLinkAccount } from "@/lib/loadLinkAccountStore";
import LoadLinkGearIcon from "@/components/LoadLinkGearIcon";

export default function AuthStatusButton({ darkMode, className = "" }: { darkMode: boolean; className?: string }) {
  const pathname = usePathname();
  const account = useLoadLinkAccount();
  const base = `relative isolate flex h-10 w-10 shrink-0 items-center justify-center rounded-full active:scale-[0.97] ${className}`;

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
        className={`${base} border-2 border-[#f6b800] bg-black p-[2px] text-[#f6b800] shadow-none`}
      >
        <span className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-black">
          {account.profile.avatar_url ? (
            <img src={account.profile.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <LoadLinkGearIcon />
          )}
        </span>
      </Link>
    );
  }

  return (
    <Link
      href={loginHref(pathname || "/")}
      aria-label="Log in or sign up"
      title="Log in / Sign up"
      className={`${base} border ${darkMode ? "border-[#f6b800]/70 bg-black text-[#f6b800]" : "border-black/10 bg-white text-black"}`}
    >
      <img src="/images/auth-icon.png" alt="" className="h-6 w-6 object-contain" />
    </Link>
  );
}
