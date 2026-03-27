import Link from "next/link";

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-carbon-page px-4 py-16 text-carbon-body sm:px-6">
      <div className="mx-auto max-w-xl space-y-4 text-center">
        <h1 className="font-heading text-2xl font-semibold text-carbon-heading">
          Documentation
        </h1>
        <p className="text-pretty text-sm leading-relaxed">
          Guides and API references are on the way. For now, explore the app
          from your dashboard or check{" "}
          <Link
            href="/status"
            className="font-medium text-carbon-accent hover:text-carbon-accent-hover"
          >
            system status
          </Link>
          .
        </p>
        <Link
          href="/"
          className="inline-block text-sm font-medium text-carbon-accent hover:text-carbon-accent-hover"
        >
          ← Back home
        </Link>
      </div>
    </div>
  );
}
