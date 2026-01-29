"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  Play,
  Square,
  Plus,
  Zap,
  Server,
  Database,
  Activity,
  MessageSquare,
} from "lucide-react";

interface ControlPanelProps {
  isRunning: boolean;
  rushHourActive: boolean;
  nameServerOnline: boolean;
  centralServerOnline: boolean;
  nodeCount: number;
  messageCount: number;
  onStart: () => void;
  onStop: () => void;
  onToggleRushHour: () => void;
  onAddNode: (preset: { name: string; intersection: string }) => void;
  presets: Array<{ name: string; intersection: string }>;
  usedPresets: string[];
}

export function ControlPanel({
  isRunning,
  rushHourActive,
  nameServerOnline,
  centralServerOnline,
  nodeCount,
  messageCount,
  onStart,
  onStop,
  onToggleRushHour,
  onAddNode,
  presets,
  usedPresets,
}: ControlPanelProps) {
  const availablePresets = presets.filter((p) => !usedPresets.includes(p.name));

  return (
    <Card className="border-zinc-800 bg-zinc-900/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold text-zinc-100">
          Panel de Control
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* System Status */}
        <div className="grid grid-cols-2 gap-3">
          <div
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg border",
              nameServerOnline
                ? "border-green-900/50 bg-green-950/20"
                : "border-zinc-800 bg-zinc-900/50"
            )}
          >
            <Database
              className={cn(
                "w-4 h-4",
                nameServerOnline ? "text-green-500" : "text-zinc-600"
              )}
            />
            <div>
              <div className="text-xs font-medium text-zinc-300">
                NameServer
              </div>
              <div
                className={cn(
                  "text-[10px]",
                  nameServerOnline ? "text-green-400" : "text-zinc-600"
                )}
              >
                {nameServerOnline ? "En línea" : "Desconectado"}
              </div>
            </div>
          </div>

          <div
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg border",
              centralServerOnline
                ? "border-cyan-900/50 bg-cyan-950/20"
                : "border-zinc-800 bg-zinc-900/50"
            )}
          >
            <Server
              className={cn(
                "w-4 h-4",
                centralServerOnline ? "text-cyan-500" : "text-zinc-600"
              )}
            />
            <div>
              <div className="text-xs font-medium text-zinc-300">
                Servidor Central
              </div>
              <div
                className={cn(
                  "text-[10px]",
                  centralServerOnline ? "text-cyan-400" : "text-zinc-600"
                )}
              >
                {centralServerOnline ? "En línea" : "Desconectado"}
              </div>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-900/50">
            <Activity className="w-4 h-4 text-amber-500" />
            <div>
              <div className="text-xs font-medium text-zinc-300">
                Nodos Activos
              </div>
              <div className="text-lg font-bold text-amber-400">{nodeCount}</div>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-900/50">
            <MessageSquare className="w-4 h-4 text-blue-500" />
            <div>
              <div className="text-xs font-medium text-zinc-300">Mensajes</div>
              <div className="text-lg font-bold text-blue-400">
                {messageCount.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* Main Controls */}
        <div className="flex gap-2">
          {!isRunning ? (
            <Button
              onClick={onStart}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              <Play className="w-4 h-4 mr-2" />
              Iniciar Sistema
            </Button>
          ) : (
            <Button
              onClick={onStop}
              variant="destructive"
              className="flex-1"
            >
              <Square className="w-4 h-4 mr-2" />
              Detener Sistema
            </Button>
          )}
        </div>

        {/* Rush Hour Toggle */}
        <Button
          onClick={onToggleRushHour}
          disabled={!isRunning}
          variant={rushHourActive ? "default" : "outline"}
          className={cn(
            "w-full",
            rushHourActive
              ? "bg-orange-600 hover:bg-orange-700 text-white"
              : "border-zinc-700 hover:bg-zinc-800"
          )}
        >
          <Zap
            className={cn("w-4 h-4 mr-2", rushHourActive && "animate-pulse")}
          />
          {rushHourActive ? "Hora Pico ACTIVADA" : "Simular Hora Pico"}
        </Button>

        {/* Add Node */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-zinc-400">
            Agregar Nodo (Semáforo)
          </label>
          <div className="flex gap-2">
            <Select
              disabled={!isRunning || availablePresets.length === 0}
              onValueChange={(value) => {
                const preset = presets.find((p) => p.name === value);
                if (preset) onAddNode(preset);
              }}
            >
              <SelectTrigger className="flex-1 border-zinc-700 bg-zinc-900">
                <SelectValue
                  placeholder={
                    availablePresets.length === 0
                      ? "Todos los nodos agregados"
                      : "Seleccionar semáforo..."
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {availablePresets.map((preset) => (
                  <SelectItem key={preset.name} value={preset.name}>
                    {preset.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-[10px] text-zinc-600">
            Los nodos se registran automáticamente en el NameServer
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
