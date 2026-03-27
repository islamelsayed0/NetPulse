"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
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
    <html lang="en">
      <body
        className="min-h-screen antialiased text-[#8b949e]"
        style={{ backgroundColor: "#0d1117" }}
      >
        <div className="flex min-h-screen flex-col items-center justify-center px-4 py-16 text-center">
          <div className="mb-8 flex items-center gap-3" aria-hidden>
            <svg
              width="40"
              height="40"
              viewBox="0 0 64 64"
              fill="none"
              className="shrink-0 text-[#22d3ee]"
            >
              <path
                d="M8 40 Q20 8 32 32 T56 24"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
                fill="none"
              />
            </svg>
            <span
              className="text-2xl font-semibold tracking-tight text-[#e6edf3]"
            >
              NetPulse
            </span>
          </div>
          <div
            className="max-w-md rounded-xl border border-[#21262d] bg-[#161b22] p-8 shadow-lg"
          >
            <h1 className="text-xl font-semibold text-[#e6edf3]">
              Something went wrong
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-[#8b949e]">
              The application hit an unexpected error. You can try reloading
              the page or return to the home page.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => reset()}
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#22d3ee] px-6 text-sm font-semibold text-[#0d1117] transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22d3ee]/50"
              >
                Try again
              </button>
              <Link
                href="/"
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[#21262d] px-6 text-sm font-medium text-[#e6edf3] transition-colors hover:bg-[#21262d]/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22d3ee]/40"
              >
                Home
              </Link>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
