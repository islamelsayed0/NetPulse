"use client";

import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    ref={ref}
    className={cn(
      "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-carbon-border bg-carbon-page transition-colors",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-carbon-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-carbon-surface",
      "disabled:cursor-not-allowed disabled:opacity-50",
      "data-[state=checked]:border-carbon-accent/60 data-[state=checked]:bg-carbon-accent/25",
      className
    )}
    {...props}
  >
    <SwitchPrimitive.Thumb
      className={cn(
        "pointer-events-none block size-5 translate-x-0.5 rounded-full bg-carbon-muted shadow-sm ring-0 transition-transform duration-200",
        "data-[state=checked]:translate-x-[22px] data-[state=checked]:bg-carbon-accent"
      )}
    />
  </SwitchPrimitive.Root>
));
Switch.displayName = SwitchPrimitive.Root.displayName;

export { Switch };
