import { Suspense } from "react";
import { DashboardRouteSkeleton } from "@/components/dashboard/dashboard-route-skeleton";
import { SettingsPageContent } from "./settings-page-content";

export default function SettingsPage() {
  return (
    <Suspense fallback={<DashboardRouteSkeleton withChart={false} />}>
      <SettingsPageContent />
    </Suspense>
  );
}
