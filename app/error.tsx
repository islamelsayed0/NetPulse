"use client";

import { useEffect } from "react";
import Link from "next/link";
import { NetPulseLogo } from "@/components/netpulse-logo";

export default function RootError({
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
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-16 text-center text-carbon-body">
      <NetPulseLogo variant="footer" className="justify-center" />
      <h1 className="mt-8 font-heading text-xl font-semibold text-carbon-heading">
        Something went wrong
      </h1>
      <p className="mt-2 max-w-md text-sm text-carbon-muted">
        An unexpected error occurred. You can try again or return home.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-carbon-accent px-6 text-sm font-semibold text-carbon-ctaText hover:bg-carbon-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-carbon-accent/50"
        >
          Try again
        </button>
        <Link
          href="/"
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-carbon-border px-6 text-sm font-medium text-carbon-heading hover:bg-carbon-border/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-carbon-accent/40"
        >
          Home
        </Link>
      </div>
    </div>
  );
}
