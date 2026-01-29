"use client";

import type { TrafficNode } from "@/lib/stid/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrafficLightVisual, CongestionBadge } from "./traffic-light-visual";
import { cn } from "@/lib/utils";
import { X, Wifi, WifiOff, Car, Clock, Users } from "lucide-react";

interface NodeCardProps {
  node: TrafficNode;
  onRemove?: (nodeId: string) => void;
}

export function NodeCard({ node, onRemove }: NodeCardProps) {
  const isOnline = node.status === "ONLINE";

  return (
    <Card
      className={cn(
        "relative overflow-hidden transition-all duration-300",
        isOnline
          ? "border-zinc-700 bg-zinc-900/50"
          : "border-red-900/50 bg-red-950/20 opacity-60"
      )}
    >
      {/* Status indicator */}
      <div
        className={cn(
          "absolute top-0 left-0 right-0 h-1",
          isOnline ? "bg-green-500" : "bg-red-500"
        )}
      />

      <CardHeader className="pb-2 pt-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-semibold text-zinc-100 truncate">
              {node.name}
            </CardTitle>
            <p className="text-xs text-zinc-500 truncate mt-0.5">
              {node.intersection}
            </p>
          </div>
          <div className="flex items-center gap-2 ml-2">
            {isOnline ? (
              <Wifi className="w-4 h-4 text-green-500" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-500" />
            )}
            {onRemove && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-zinc-500 hover:text-red-400 hover:bg-red-950/50"
                onClick={() => onRemove(node.nodeId)}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 pb-4">
        <div className="flex gap-4">
          {/* Traffic Light Visual */}
          <TrafficLightVisual state={node.currentState} size="md" />

          {/* Metrics */}
          <div className="flex-1 space-y-2">
            {node.lastMetrics ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500">Congestión</span>
                  <CongestionBadge level={node.lastMetrics.congestionLevel} />
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1.5 text-zinc-400">
                    <Car className="w-3.5 h-3.5" />
                    <span>{node.lastMetrics.vehicleCount} vehículos</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-zinc-400">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{node.lastMetrics.averageWaitTime}s espera</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-zinc-400">
                    <Users className="w-3.5 h-3.5" />
                    <span>{node.lastMetrics.queueLength} en cola</span>
                  </div>
                </div>

                {/* Timing info */}
                <div className="flex gap-2 pt-1 border-t border-zinc-800 mt-2">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-900/30 text-green-400">
                    V: {node.timing.greenDuration}s
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-900/30 text-yellow-400">
                    A: {node.timing.yellowDuration}s
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-900/30 text-red-400">
                    R: {node.timing.redDuration}s
                  </span>
                </div>
              </>
            ) : (
              <div className="text-xs text-zinc-500 italic">
                Esperando métricas...
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
