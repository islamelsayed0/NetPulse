"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const INTERVAL_SEC = 60;

export function PlatformStatusRefresh() {
  const router = useRouter();
  const [seconds, setSeconds] = useState(INTERVAL_SEC);

  useEffect(() => {
    const id = window.setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          router.refresh();
          return INTERVAL_SEC;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [router]);

  return (
    <span className="tabular-nums text-carbon-body" aria-live="polite">
      Refreshing in {seconds}s
    </span>
  );
}
