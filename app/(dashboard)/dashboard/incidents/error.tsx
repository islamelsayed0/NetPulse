"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function DashboardRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center text-carbon-body">
      <h1 className="font-heading text-lg font-semibold text-carbon-heading">
        This view could not be loaded
      </h1>
      <p className="mt-2 text-sm text-carbon-muted">
        {error.message || "Something went wrong while loading this page."}
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-carbon-accent px-5 text-sm font-semibold text-carbon-ctaText hover:bg-carbon-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-carbon-accent/50"
        >
          Try again
        </button>
        <Link
          href="/dashboard"
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-carbon-border px-5 text-sm font-medium text-carbon-heading hover:bg-carbon-border/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-carbon-accent/40"
        >
          Dashboard home
        </Link>
      </div>
    </div>
  );
}
