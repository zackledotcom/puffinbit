"use client";

import { cn } from "../../lib/utils";
import React from "react";

interface AnimatedShinyTextProps {
  children: React.ReactNode;
  className?: string;
}

export const AnimatedShinyText = React.forwardRef<
  HTMLDivElement,
  AnimatedShinyTextProps
>(({ children, className }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "relative inline-block overflow-hidden rounded-lg px-3 py-1 text-sm font-medium text-black bg-white border border-white hover:border-gray-200 transition-all duration-300",
        "before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_12s_infinite] before:bg-gradient-to-r before:from-transparent before:via-gray-400/30 before:to-transparent",
        className,
      )}
    >
      <span className="relative z-10">{children}</span>
    </div>
  );
});

AnimatedShinyText.displayName = "AnimatedShinyText";