"use client";

import { useState, useEffect, useCallback } from "react";
import { simulationManager, INTERSECTION_PRESETS } from "@/lib/stid";
import type { SystemState } from "@/lib/stid/types";
import { ControlPanel } from "./control-panel";
import { NodeCard } from "./node-card";
import { LogViewer } from "./log-viewer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

const initialState: SystemState = {
  nameServerOnline: false,
  centralServerOnline: false,
  registeredNodes: [],
  totalMessages: 0,
  logs: [],
  simulationRunning: false,
  rushHourActive: false,
};

export function STIDDashboard() {
  const [systemState, setSystemState] = useState<SystemState>(initialState);
  const [activeTab, setActiveTab] = useState("nodes");

  // Subscribe to state changes
  useEffect(() => {
    const unsubscribe = simulationManager.onStateChange((state) => {
      setSystemState(state);
    });

    // Get initial state
    setSystemState(simulationManager.getState());

    return () => {
      unsubscribe();
    };
  }, []);

  // Periodic refresh for real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      if (simulationManager.isSimulationRunning()) {
        setSystemState(simulationManager.getState());
      }
    }, 500);

    return () => clearInterval(interval);
  }, []);

  const handleStart = useCallback(async () => {
    await simulationManager.start();
  }, []);

  const handleStop = useCallback(async () => {
    await simulationManager.stop();
  }, []);

  const handleToggleRushHour = useCallback(() => {
    simulationManager.setRushHour(!systemState.rushHourActive);
  }, [systemState.rushHourActive]);

  const handleAddNode = useCallback(
    async (preset: { name: string; intersection: string }) => {
      await simulationManager.addNode(preset.name, preset.intersection);
    },
    []
  );

  const handleRemoveNode = useCallback(async (nodeId: string) => {
    await simulationManager.removeNode(nodeId);
  }, []);

  const usedPresets = systemState.registeredNodes.map((n) => n.name);
  const onlineNodes = systemState.registeredNodes.filter(
    (n) => n.status === "ONLINE"
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                STID
                <span className="text-zinc-500 font-normal ml-2">
                  Sistema de Tráfico Inteligente Distribuido
                </span>
              </h1>
              <p className="text-sm text-zinc-500 mt-1">
                MVP de simulación de red de semáforos inteligentes
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge
                variant={systemState.simulationRunning ? "default" : "secondary"}
                className={
                  systemState.simulationRunning
                    ? "bg-green-600 hover:bg-green-600"
                    : ""
                }
              >
                {systemState.simulationRunning ? "Sistema Activo" : "Sistema Inactivo"}
              </Badge>
              {systemState.rushHourActive && (
                <Badge className="bg-orange-600 hover:bg-orange-600 animate-pulse">
                  Hora Pico
                </Badge>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Control Panel - Sidebar */}
          <div className="lg:col-span-1">
            <ControlPanel
              isRunning={systemState.simulationRunning}
              rushHourActive={systemState.rushHourActive}
              nameServerOnline={systemState.nameServerOnline}
              centralServerOnline={systemState.centralServerOnline}
              nodeCount={onlineNodes.length}
              messageCount={systemState.totalMessages}
              onStart={handleStart}
              onStop={handleStop}
              onToggleRushHour={handleToggleRushHour}
              onAddNode={handleAddNode}
              presets={INTERSECTION_PRESETS}
              usedPresets={usedPresets}
            />

            {/* Architecture Info */}
            <Card className="mt-4 border-zinc-800 bg-zinc-900/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-zinc-400">
                  Arquitectura Distribuida
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-zinc-500 space-y-2">
                <p>
                  <span className="text-purple-400">NameServer:</span> Registro y
                  descubrimiento de nodos
                </p>
                <p>
                  <span className="text-cyan-400">Servidor Central:</span>{" "}
                  Coordinación de tiempos
                </p>
                <p>
                  <span className="text-green-400">Nodos:</span> Semáforos
                  autónomos con cámara simulada
                </p>
                <p>
                  <span className="text-zinc-400">Comunicación:</span> 100% por
                  mensajes, sin memoria compartida
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Main Area */}
          <div className="lg:col-span-3">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4 bg-zinc-900 border border-zinc-800">
                <TabsTrigger value="nodes" className="data-[state=active]:bg-zinc-800">
                  Nodos ({systemState.registeredNodes.length})
                </TabsTrigger>
                <TabsTrigger value="logs" className="data-[state=active]:bg-zinc-800">
                  Logs del Sistema
                </TabsTrigger>
              </TabsList>

              <TabsContent value="nodes" className="mt-0">
                {systemState.registeredNodes.length === 0 ? (
                  <Card className="border-zinc-800 bg-zinc-900/30">
                    <CardContent className="py-12 text-center">
                      <div className="text-zinc-600 mb-2">
                        No hay nodos registrados
                      </div>
                      <p className="text-xs text-zinc-700">
                        {systemState.simulationRunning
                          ? "Usa el panel de control para agregar semáforos a la red"
                          : "Inicia el sistema y agrega semáforos para comenzar la simulación"}
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {systemState.registeredNodes.map((node) => (
                      <NodeCard
                        key={node.nodeId}
                        node={node}
                        onRemove={handleRemoveNode}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="logs" className="mt-0">
                <Card className="border-zinc-800 bg-zinc-900/30">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium text-zinc-400">
                        Logs del Sistema
                      </CardTitle>
                      <span className="text-xs text-zinc-600">
                        {systemState.logs.length} entradas
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <LogViewer logs={systemState.logs} maxHeight="500px" />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 mt-8">
        <div className="container mx-auto px-4 py-4">
          <p className="text-xs text-zinc-600 text-center">
            STID - Sistema de Tráfico Inteligente Distribuido | MVP para defensa
            académica | Arquitectura: NameServer + Servidor Central + Nodos
            Autónomos
          </p>
        </div>
      </footer>
    </div>
  );
}
