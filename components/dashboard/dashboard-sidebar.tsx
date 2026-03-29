"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, useClerk, useUser } from "@clerk/nextjs";
import {
  LayoutDashboard,
  LogOut,
  Radio,
  Siren,
  Settings,
} from "lucide-react";
import { NetPulseLogo } from "@/components/netpulse-logo";
import { cn } from "@/lib/utils";

function headerAvatarInitials(
  user: ReturnType<typeof useUser>["user"]
): string {
  if (!user) return "?";
  const fn = user.firstName?.charAt(0);
  const ln = user.lastName?.charAt(0);
  if (fn && ln) return (fn + ln).toUpperCase();
  const full = user.fullName?.trim();
  if (full) {
    const parts = full.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (
        parts[0].charAt(0) + parts[parts.length - 1].charAt(0)
      ).toUpperCase();
    }
    return full.slice(0, 2).toUpperCase();
  }
  const em =
    user.primaryEmailAddress?.emailAddress ??
    user.emailAddresses[0]?.emailAddress;
  return em ? em.slice(0, 2).toUpperCase() : "?";
}

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/monitors", label: "Monitors", icon: Radio },
  { href: "/dashboard/incidents", label: "Incidents", icon: Siren },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

export function DashboardSidebar() {
  const pathname = usePathname();
  const { signOut } = useClerk();
  const { user, isLoaded } = useUser();
  const email =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses[0]?.emailAddress ??
    "";

  const handleSignOut = () => {
    void signOut({ redirectUrl: "/" });
  };

  return (
    <aside
      className={cn(
        "z-40 border-carbon-border bg-carbon-deeper",
        "sticky top-0 border-b md:fixed md:inset-y-0 md:left-0 md:flex md:h-svh md:w-64 md:flex-col md:border-b-0 md:border-r"
      )}
    >
      <div className="flex h-14 items-center justify-between gap-3 border-carbon-border px-4 md:h-16 md:border-b md:px-5">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Link
            href="/dashboard"
            className="min-w-0 shrink rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-carbon-accent/40"
          >
            <NetPulseLogo
              variant="footer"
              className="gap-2"
              iconClassName="size-6 sm:size-7"
            />
          </Link>
          {isLoaded && user?.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- Clerk CDN avatar URL
            <img
              src={user.imageUrl}
              alt=""
              className="hidden size-9 shrink-0 rounded-full object-cover ring-2 ring-carbon-border md:block"
            />
          ) : isLoaded && user ? (
            <div
              className="hidden size-9 shrink-0 items-center justify-center rounded-full bg-carbon-accent/15 text-xs font-semibold text-carbon-accent ring-2 ring-carbon-border md:flex"
              aria-hidden
            >
              {headerAvatarInitials(user)}
            </div>
          ) : (
            <div
              className="hidden size-9 shrink-0 animate-pulse rounded-full bg-carbon-border/40 ring-2 ring-carbon-border md:block"
              aria-hidden
            />
          )}
        </div>
        <div className="flex items-center gap-2 md:hidden">
          <UserButton
            appearance={{
              elements: {
                avatarBox: "size-8 ring-2 ring-carbon-border",
              },
            }}
          />
        </div>
      </div>

      <nav
        className="flex gap-1 overflow-x-auto px-2 py-2 md:flex-1 md:flex-col md:gap-0.5 md:overflow-y-auto md:p-3 md:py-3"
        aria-label="Dashboard"
      >
        {nav.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors md:gap-3 md:py-2.5",
                active
                  ? "bg-carbon-accent/[0.12] text-carbon-accent md:border-l-2 md:border-carbon-accent md:bg-carbon-accent/[0.08]"
                  : "text-carbon-muted hover:bg-carbon-border/30 hover:text-carbon-body md:border-l-2 md:border-transparent"
              )}
            >
              <Icon className="size-[18px] shrink-0 opacity-90" strokeWidth={1.75} />
              <span className="whitespace-nowrap">{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-carbon-border p-3 md:hidden">
        <button
          type="button"
          onClick={handleSignOut}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
            "text-carbon-danger hover:bg-[#f8514915]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-carbon-danger/35"
          )}
        >
          <LogOut className="size-4 shrink-0" strokeWidth={1.75} />
          Sign Out
        </button>
      </div>

      <div className="hidden border-t border-carbon-border p-4 md:block">
        <div className="flex items-center gap-3">
          <UserButton
            appearance={{
              elements: {
                avatarBox: "size-9 ring-2 ring-carbon-border",
              },
            }}
          />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-medium uppercase tracking-wider text-carbon-muted">
              Signed in
            </p>
            <p
              className="truncate text-xs text-carbon-heading"
              title={isLoaded ? email : undefined}
            >
              {isLoaded ? email || "—" : "…"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          className={cn(
            "mt-3 flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors",
            "text-carbon-danger hover:bg-[#f8514915]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-carbon-danger/35"
          )}
        >
          <LogOut className="size-4 shrink-0" strokeWidth={1.75} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
