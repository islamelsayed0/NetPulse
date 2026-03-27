import { Suspense } from "react";
import { DashboardRouteSkeleton } from "@/components/dashboard/dashboard-route-skeleton";
import { MonitorsPageContent } from "./monitors-page-content";

export default function MonitorsPage() {
  return (
    <Suspense fallback={<DashboardRouteSkeleton withChart={false} />}>
      <MonitorsPageContent />
    </Suspense>
  );
}
