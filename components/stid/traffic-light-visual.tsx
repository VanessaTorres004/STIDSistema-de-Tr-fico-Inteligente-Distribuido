"use client";

import type { TrafficLightState, CongestionLevel } from "@/lib/stid/types";
import { cn } from "@/lib/utils";

interface TrafficLightVisualProps {
  state: TrafficLightState;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function TrafficLightVisual({
  state,
  size = "md",
  className,
}: TrafficLightVisualProps) {
  const sizeClasses = {
    sm: "w-6 h-16",
    md: "w-10 h-28",
    lg: "w-14 h-40",
  };

  const lightSizeClasses = {
    sm: "w-4 h-4",
    md: "w-7 h-7",
    lg: "w-10 h-10",
  };

  return (
    <div
      className={cn(
        "rounded-lg bg-zinc-800 flex flex-col items-center justify-around p-1.5 shadow-lg border border-zinc-700",
        sizeClasses[size],
        className
      )}
    >
      {/* Red Light */}
      <div
        className={cn(
          "rounded-full transition-all duration-300",
          lightSizeClasses[size],
          state === "ROJO"
            ? "bg-red-500 shadow-[0_0_12px_4px_rgba(239,68,68,0.6)]"
            : "bg-red-900/40"
        )}
      />
      {/* Yellow Light */}
      <div
        className={cn(
          "rounded-full transition-all duration-300",
          lightSizeClasses[size],
          state === "AMARILLO"
            ? "bg-yellow-400 shadow-[0_0_12px_4px_rgba(250,204,21,0.6)]"
            : "bg-yellow-900/40"
        )}
      />
      {/* Green Light */}
      <div
        className={cn(
          "rounded-full transition-all duration-300",
          lightSizeClasses[size],
          state === "VERDE"
            ? "bg-green-500 shadow-[0_0_12px_4px_rgba(34,197,94,0.6)]"
            : "bg-green-900/40"
        )}
      />
    </div>
  );
}

interface CongestionBadgeProps {
  level: CongestionLevel;
  className?: string;
}

export function CongestionBadge({ level, className }: CongestionBadgeProps) {
  const colors = {
    BAJO: "bg-green-500/20 text-green-400 border-green-500/30",
    MEDIO: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    ALTO: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    CRITICO: "bg-red-500/20 text-red-400 border-red-500/30",
  };

  return (
    <span
      className={cn(
        "px-2 py-0.5 rounded-full text-xs font-medium border",
        colors[level],
        className
      )}
    >
      {level}
    </span>
  );
}
