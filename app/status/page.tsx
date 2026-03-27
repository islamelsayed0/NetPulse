import type { Metadata } from "next";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Status",
  description: "NetPulse platform and API availability.",
};

const services = [
  { name: "Web application", status: "Operational" as const },
  { name: "API", status: "Operational" as const },
  { name: "Notifications", status: "Operational" as const },
];

export default function StatusPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <Link href="/" className="text-sm font-semibold">
            NetPulse
          </Link>
          <Link
            href="/sign-in"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Sign in
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          System status
        </h1>
        <p className="mt-2 text-muted-foreground">
          Current status of NetPulse services. This page is public and does not
          require authentication.
        </p>

        <div className="mt-10 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-200">
          <strong className="font-medium">All systems operational</strong>
          <span className="text-emerald-700/90 dark:text-emerald-300/90">
            {" "}
            — No incidents reported.
          </span>
        </div>

        <ul className="mt-8 space-y-4">
          {services.map((service) => (
            <li key={service.name}>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div>
                    <CardTitle className="text-base">{service.name}</CardTitle>
                    <CardDescription>Last checked: live</CardDescription>
                  </div>
                  <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                    {service.status}
                  </span>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground">
                    Placeholder health check—connect your probes and incident
                    feeds in the dashboard.
                  </p>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
