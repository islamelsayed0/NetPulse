"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, useClerk, useUser } from "@clerk/nextjs";
import {
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeft,
  Radio,
  Settings,
  Siren,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { NetPulseLogo } from "@/components/netpulse-logo";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { STORAGE_KEYS } from "@/lib/constants";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/monitors", label: "Monitors", icon: Radio },
  { href: "/dashboard/incidents", label: "Incidents", icon: Siren },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

export function DashboardLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { signOut } = useClerk();
  const { user, isLoaded } = useUser();
  const email =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses[0]?.emailAddress ??
    "";

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(
        localStorage.getItem(STORAGE_KEYS.sidebarCollapsed) === "1"
      );
    } catch {
      /* ignore */
    }
  }, []);

  const persistCollapsed = useCallback((next: boolean) => {
    setCollapsed(next);
    try {
      localStorage.setItem(STORAGE_KEYS.sidebarCollapsed, next ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  const handleSignOut = () => {
    void signOut({ redirectUrl: "/" });
  };

  const NavLink = ({
    href,
    label,
    icon: Icon,
  }: (typeof nav)[number]) => {
    const active =
      href === "/dashboard"
        ? pathname === "/dashboard"
        : pathname.startsWith(href);
    const link = (
      <Link
        href={href}
        onClick={() => setMobileOpen(false)}
        className={cn(
          "flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors md:min-h-0 md:gap-3",
          collapsed && "md:justify-center md:px-2",
          active
            ? "bg-carbon-accent/[0.12] text-carbon-accent md:border-l-2 md:border-carbon-accent md:bg-carbon-accent/[0.08]"
            : "text-carbon-muted hover:bg-carbon-border/30 hover:text-carbon-body md:border-l-2 md:border-transparent"
        )}
      >
        <Icon
          className="size-[18px] shrink-0 opacity-90"
          strokeWidth={1.75}
          aria-hidden
        />
        <span
          className={cn(
            "whitespace-nowrap",
            collapsed && "md:sr-only"
          )}
        >
          {label}
        </span>
      </Link>
    );
    if (collapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>{link}</TooltipTrigger>
          <TooltipContent side="right" className="border-carbon-border bg-carbon-surface text-carbon-heading">
            {label}
          </TooltipContent>
        </Tooltip>
      );
    }
    return link;
  };

  return (
    <TooltipProvider>
      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden"
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <aside
        className={cn(
          "z-50 border-carbon-border bg-carbon-deeper md:z-40",
          "fixed inset-y-0 left-0 flex w-[min(100vw,18rem)] max-w-full -translate-x-full flex-col border-r transition-transform duration-200 ease-out md:translate-x-0",
          mobileOpen && "translate-x-0",
          collapsed ? "md:w-[4.5rem]" : "md:w-64"
        )}
        aria-hidden={!mobileOpen ? undefined : undefined}
      >
        <div className="flex h-14 min-h-11 items-center justify-between gap-2 border-b border-carbon-border px-3 md:h-16 md:px-3">
          <div
            className={cn(
              "flex min-w-0 flex-1 items-center gap-2",
              collapsed && "md:justify-center md:gap-0"
            )}
          >
            <button
              type="button"
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-carbon-heading hover:bg-carbon-border/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-carbon-accent/40 md:hidden"
              onClick={() => setMobileOpen(false)}
              aria-label="Close navigation menu"
            >
              <X className="size-5" strokeWidth={1.75} aria-hidden />
            </button>
            <Link
              href="/dashboard"
              onClick={() => setMobileOpen(false)}
              className={cn(
                "min-w-0 shrink rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-carbon-accent/40",
                collapsed && "md:flex md:justify-center"
              )}
            >
              <NetPulseLogo
                variant="footer"
                className={cn("gap-2", collapsed && "md:[&_span]:sr-only")}
                iconClassName="size-6 sm:size-7"
              />
            </Link>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="hidden min-h-11 min-w-11 items-center justify-center rounded-lg text-carbon-muted hover:bg-carbon-border/30 hover:text-carbon-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-carbon-accent/40 md:inline-flex"
              onClick={() => persistCollapsed(!collapsed)}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-pressed={collapsed}
            >
              {collapsed ? (
                <PanelLeft className="size-5" strokeWidth={1.75} aria-hidden />
              ) : (
                <PanelLeftClose
                  className="size-5"
                  strokeWidth={1.75}
                  aria-hidden
                />
              )}
            </button>
            <div className="md:hidden">
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: "size-9 min-h-11 min-w-11 ring-2 ring-carbon-border",
                  },
                }}
              />
            </div>
          </div>
        </div>

        <nav
          className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3"
          aria-label="Dashboard"
        >
          {nav.map((item) => (
            <NavLink key={item.href} {...item} />
          ))}
        </nav>

        <div className="border-t border-carbon-border p-3 md:hidden">
          <button
            type="button"
            onClick={handleSignOut}
            className={cn(
              "flex min-h-11 w-full items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              "text-carbon-danger hover:bg-[#f8514915]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-carbon-danger/35"
            )}
          >
            <LogOut className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
            Sign Out
          </button>
        </div>

        <div
          className={cn(
            "hidden border-t border-carbon-border p-4 md:block",
            collapsed && "md:px-2"
          )}
        >
          <div
            className={cn(
              "flex items-center gap-3",
              collapsed && "md:justify-center"
            )}
          >
            <UserButton
              appearance={{
                elements: {
                  avatarBox:
                    "size-9 min-h-11 min-w-11 ring-2 ring-carbon-border",
                },
              }}
            />
            <div
              className={cn(
                "min-w-0 flex-1",
                collapsed && "md:hidden"
              )}
            >
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
              "mt-3 flex min-h-11 w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors",
              "text-carbon-danger hover:bg-[#f8514915]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-carbon-danger/35",
              collapsed && "md:justify-center md:px-2"
            )}
          >
            <LogOut className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
            <span className={cn(collapsed && "md:sr-only")}>Sign Out</span>
          </button>
        </div>
      </aside>

      <div className="flex min-h-svh flex-1 flex-col overflow-x-hidden">
        <header className="sticky top-0 z-30 flex min-h-14 items-center gap-2 border-b border-carbon-border bg-carbon-page/95 px-3 backdrop-blur-md md:hidden">
          <button
            type="button"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-carbon-heading hover:bg-carbon-border/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-carbon-accent/40"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation menu"
            aria-expanded={mobileOpen}
          >
            <Menu className="size-5" strokeWidth={1.75} aria-hidden />
          </button>
          <Link
            href="/dashboard"
            className="min-w-0 flex-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-carbon-accent/40 rounded-md"
          >
            <NetPulseLogo
              variant="footer"
              className="gap-2"
              iconClassName="size-6"
            />
          </Link>
          <UserButton
            appearance={{
              elements: {
                avatarBox: "size-9 min-h-11 min-w-11 ring-2 ring-carbon-border",
              },
            }}
          />
        </header>

        <main
          className={cn(
            "min-h-0 flex-1 overflow-y-auto overflow-x-hidden transition-[padding] duration-200 ease-out",
            collapsed ? "md:pl-[4.5rem]" : "md:pl-64"
          )}
        >
          <div
            key={pathname}
            className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:duration-200 min-h-full"
          >
            {children}
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
}
