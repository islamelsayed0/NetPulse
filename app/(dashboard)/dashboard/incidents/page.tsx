import { Suspense } from "react";
import { DashboardRouteSkeleton } from "@/components/dashboard/dashboard-route-skeleton";
import { IncidentsPageContent } from "./incidents-page-content";

export default function IncidentsPage() {
  return (
    <Suspense fallback={<DashboardRouteSkeleton withChart={false} />}>
      <IncidentsPageContent />
    </Suspense>
  );
}
