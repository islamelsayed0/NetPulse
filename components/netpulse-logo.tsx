import type { SVGProps } from "react";
import { cn } from "@/lib/utils";

type NetPulseLogoProps = {
  className?: string;
  iconClassName?: string;
  /** Marketing: white wordmark. Footer: heading token */
  variant?: "marketing" | "footer";
} & Omit<SVGProps<SVGSVGElement>, "children" | "className">;

function PulseIcon({
  className,
  ...props
}: Omit<SVGProps<SVGSVGElement>, "children">) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={cn("size-7 shrink-0 sm:size-8", className)}
      {...props}
    >
      <path
        d="M2 12h3.2l1.4-4.5 2.8 9 2.4-12 3.2 11 2-3.5H22"
        stroke="#22d3ee"
        strokeWidth="1.65"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function NetPulseLogo({
  className,
  iconClassName,
  variant = "marketing",
  ...iconProps
}: NetPulseLogoProps) {
  return (
    <span
      className={cn("inline-flex items-center gap-2.5", className)}
      role="img"
      aria-label="NetPulse"
    >
      <PulseIcon className={iconClassName} {...iconProps} />
      <span
        className={cn(
          "font-sans text-lg font-bold tracking-tight sm:text-xl",
          variant === "marketing" ? "text-white" : "text-carbon-heading"
        )}
      >
        NetPulse
      </span>
    </span>
  );
}
