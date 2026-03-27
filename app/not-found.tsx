import Link from "next/link";
import { NetPulseLogo } from "@/components/netpulse-logo";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-carbon-page px-4 text-center text-carbon-body">
      <NetPulseLogo variant="footer" className="justify-center" />
      <p className="mt-8 font-heading text-6xl font-semibold text-carbon-heading">
        404
      </p>
      <h1 className="mt-2 text-lg text-carbon-heading">Page not found</h1>
      <p className="mt-2 max-w-md text-sm text-carbon-muted">
        The page you requested does not exist or was moved.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex min-h-11 items-center justify-center rounded-lg bg-carbon-accent px-6 text-sm font-semibold text-carbon-ctaText transition-colors hover:bg-carbon-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-carbon-accent/50"
      >
        Back to home
      </Link>
    </div>
  );
}
