"use client";

import Link, { type LinkProps } from "next/link";
import { useRouter } from "next/navigation";
import type { MouseEvent, ReactNode } from "react";

import { isAuthenticatedUser, loginHref } from "@/lib/auth";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";

type Props = LinkProps & {
  children: ReactNode;
  className?: string;
  "aria-label"?: string;
  title?: string;
  onAuthenticatedClick?: () => void;
};

export default function RequireAuthLink({
  href,
  children,
  className,
  onAuthenticatedClick,
  ...props
}: Props) {
  const router = useRouter();
  const target = typeof href === "string" ? href : href.pathname || "/";

  async function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    event.preventDefault();
    if (!isSupabaseConfigured) {
      router.push(loginHref(target));
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!isAuthenticatedUser(user)) {
      router.push(loginHref(target));
      return;
    }

    onAuthenticatedClick?.();
    router.push(target);
  }

  return (
    <Link href={href} className={className} onClick={handleClick} {...props}>
      {children}
    </Link>
  );
}
