"use client";

import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      position="top-center"
      closeButton
      richColors
      toastOptions={{
        classNames: {
          toast:
            "border border-carbon-border bg-carbon-surface text-carbon-heading shadow-lg",
          title: "font-semibold text-carbon-heading",
          description: "text-carbon-body",
        },
      }}
    />
  );
}
