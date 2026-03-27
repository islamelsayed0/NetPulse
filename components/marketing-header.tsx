import Link from "next/link";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import { NetPulseLogo } from "@/components/netpulse-logo";
import { cn } from "@/lib/utils";

const navLinkClass =
  "text-sm font-medium text-carbon-muted transition-colors hover:text-carbon-body focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-carbon-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-carbon-page rounded-sm";

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-carbon-border bg-carbon-page/95 backdrop-blur-md supports-[backdrop-filter]:bg-carbon-page/80">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:px-6 md:h-16 md:flex-row md:items-center md:justify-between md:gap-4 md:py-0">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/"
            className="shrink-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-carbon-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-carbon-page"
          >
            <NetPulseLogo />
          </Link>

          <div className="flex items-center gap-2 sm:gap-3 md:hidden">
            <Show when="signed-out">
              {/* Single-line: avoid whitespace text nodes between SignInButton and button (Clerk uses React.Children.only). */}
              <SignInButton><button type="button" className="text-sm font-medium text-carbon-muted transition-colors hover:text-carbon-body">Sign in</button></SignInButton>
              <Link
                href="/sign-up"
                className="inline-flex h-9 items-center justify-center rounded-lg bg-carbon-accent px-3.5 text-sm font-semibold text-carbon-ctaText transition-colors hover:bg-carbon-accent-hover"
              >
                Get Started
              </Link>
            </Show>
            <Show when="signed-in">
              <Link
                href="/dashboard"
                className="text-sm font-medium text-carbon-muted transition-colors hover:text-carbon-body"
              >
                Dashboard
              </Link>
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: "size-9 ring-2 ring-carbon-border",
                  },
                }}
              />
            </Show>
          </div>
        </div>

        <nav
          className="flex items-center justify-center gap-5 border-t border-carbon-border pt-3 sm:gap-8 md:flex-1 md:justify-center md:border-0 md:pt-0"
          aria-label="Marketing"
        >
          <a href="#features" className={navLinkClass}>
            Features
          </a>
          <Link href="/status" className={navLinkClass}>
            Status
          </Link>
          <Link href="/docs" className={navLinkClass}>
            Docs
          </Link>
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Show when="signed-out">
            <SignInButton><button type="button" className="text-sm font-medium text-carbon-muted transition-colors hover:text-carbon-body focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-carbon-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-carbon-page">Sign in</button></SignInButton>
            <Link
              href="/sign-up"
              className={cn(
                "inline-flex h-10 items-center justify-center rounded-lg bg-carbon-accent px-5 text-sm font-semibold text-carbon-ctaText transition-colors hover:bg-carbon-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-carbon-accent focus-visible:ring-offset-2 focus-visible:ring-offset-carbon-page"
              )}
            >
              Get Started
            </Link>
          </Show>
          <Show when="signed-in">
            <Link href="/dashboard" className={navLinkClass}>
              Dashboard
            </Link>
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "size-9 ring-2 ring-carbon-border",
                },
              }}
            />
          </Show>
        </div>
      </div>
    </header>
  );
}
