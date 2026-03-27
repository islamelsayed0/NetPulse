import { Suspense } from "react";
import { DashboardRouteSkeleton } from "@/components/dashboard/dashboard-route-skeleton";
import { DashboardHomeContent } from "./dashboard-home-content";

export default function DashboardHomePage() {
  return (
    <Suspense fallback={<DashboardRouteSkeleton withChart />}>
      <DashboardHomeContent />
    </Suspense>
  );
}
