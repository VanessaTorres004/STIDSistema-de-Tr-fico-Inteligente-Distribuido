"use client";

import { useRef, useEffect } from "react";
import type { LogEntry } from "@/lib/stid/types";
import { cn } from "@/lib/utils";

interface LogViewerProps {
  logs: LogEntry[];
  maxHeight?: string;
  className?: string;
}

export function LogViewer({
  logs,
  maxHeight = "400px",
  className,
}: LogViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  const getLevelColor = (level: LogEntry["level"]) => {
    switch (level) {
      case "INFO":
        return "text-blue-400";
      case "WARN":
        return "text-yellow-400";
      case "ERROR":
        return "text-red-400";
      case "DEBUG":
        return "text-zinc-500";
      default:
        return "text-zinc-400";
    }
  };

  const getSourceColor = (source: string) => {
    if (source === "name-server") return "text-purple-400";
    if (source === "central-server") return "text-cyan-400";
    if (source === "MessageBroker") return "text-zinc-500";
    if (source === "SimulationManager") return "text-amber-400";
    if (source.startsWith("node_")) return "text-green-400";
    return "text-zinc-400";
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "bg-zinc-950 rounded-lg border border-zinc-800 overflow-auto font-mono text-xs",
        className
      )}
      style={{ maxHeight }}
    >
      <div className="p-3 space-y-0.5">
        {logs.length === 0 ? (
          <div className="text-zinc-600 italic text-center py-8">
            No hay logs disponibles. Inicia la simulación para ver la actividad del sistema.
          </div>
        ) : (
          logs.map((log, index) => (
            <div
              key={`${log.timestamp}-${index}`}
              className="flex gap-2 hover:bg-zinc-900/50 px-1 py-0.5 rounded"
            >
              <span className="text-zinc-600 flex-shrink-0">
                [{formatTime(log.timestamp)}]
              </span>
              <span
                className={cn(
                  "flex-shrink-0 w-12 uppercase",
                  getLevelColor(log.level)
                )}
              >
                {log.level}
              </span>
              <span
                className={cn("flex-shrink-0 truncate", getSourceColor(log.source))}
                style={{ maxWidth: "140px" }}
              >
                {log.source.startsWith("node_")
                  ? log.source.substring(0, 15) + "..."
                  : log.source}
              </span>
              <span className="text-zinc-300 flex-1">{log.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
