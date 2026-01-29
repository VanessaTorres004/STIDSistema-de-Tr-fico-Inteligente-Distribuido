/**
 * STID - Simulation Manager
 * Orchestrates the entire distributed traffic system simulation
 */

import type { SystemState, LogEntry, TrafficNode as TrafficNodeType } from "./types";
import { messageBroker } from "./message-broker";
import { nameServer, NAME_SERVER_ID } from "./name-server";
import { centralServer, CENTRAL_SERVER_ID } from "./central-server";
import { TrafficLightNode } from "./traffic-node";

/**
 * SimulationManager - Coordinates the entire STID simulation
 */
class SimulationManager {
  private nodes: Map<string, TrafficLightNode> = new Map();
  private isRunning = false;
  private rushHourActive = false;
  private stateListeners: Set<(state: SystemState) => void> = new Set();
  private logUnsubscribe: (() => void) | null = null;

  /**
   * Initialize and start the simulation
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      messageBroker.log("WARN", "SimulationManager", "Simulation already running");
      return;
    }

    messageBroker.log("INFO", "SimulationManager", "=== INICIANDO SISTEMA STID ===");

    // Start core servers
    nameServer.start();
    centralServer.start();

    // Subscribe to log updates
    this.logUnsubscribe = messageBroker.onLog(() => {
      this.notifyStateChange();
    });

    this.isRunning = true;

    messageBroker.log("INFO", "SimulationManager", "Sistema STID iniciado - Listo para añadir nodos");
    this.notifyStateChange();
  }

  /**
   * Stop the simulation
   */
  async stop(): Promise<void> {
    if (!this.isRunning) return;

    messageBroker.log("INFO", "SimulationManager", "=== DETENIENDO SISTEMA STID ===");

    // Stop all nodes
    for (const node of this.nodes.values()) {
      await node.stop();
    }
    this.nodes.clear();

    // Stop core servers
    centralServer.stop();
    nameServer.stop();

    // Unsubscribe from logs
    if (this.logUnsubscribe) {
      this.logUnsubscribe();
      this.logUnsubscribe = null;
    }

    this.isRunning = false;

    messageBroker.log("INFO", "SimulationManager", "Sistema STID detenido");
    this.notifyStateChange();
  }

  /**
   * Add a new traffic node to the simulation
   */
  async addNode(name: string, intersection: string): Promise<TrafficLightNode> {
    if (!this.isRunning) {
      throw new Error("Simulation must be running to add nodes");
    }

    const node = new TrafficLightNode(name, intersection);
    this.nodes.set(node.nodeId, node);

    await node.start();

    // Apply rush hour if active
    if (this.rushHourActive) {
      node.setRushHour(true);
    }

    this.notifyStateChange();
    return node;
  }

  /**
   * Remove a node from the simulation
   */
  async removeNode(nodeId: string): Promise<void> {
    const node = this.nodes.get(nodeId);
    if (node) {
      await node.stop();
      this.nodes.delete(nodeId);
      messageBroker.log(
        "INFO",
        "SimulationManager",
        `Nodo ${node.name} eliminado de la simulación`
      );
      this.notifyStateChange();
    }
  }

  /**
   * Toggle rush hour mode
   */
  setRushHour(enabled: boolean): void {
    this.rushHourActive = enabled;
    
    for (const node of this.nodes.values()) {
      node.setRushHour(enabled);
    }

    messageBroker.log(
      "INFO",
      "SimulationManager",
      `=== MODO HORA PICO: ${enabled ? "ACTIVADO" : "DESACTIVADO"} ===`
    );
    this.notifyStateChange();
  }

  /**
   * Get current system state
   */
  getState(): SystemState {
    const registeredNodes = nameServer.getRegisteredNodes();
    
    const nodesWithDetails: TrafficNodeType[] = registeredNodes.map((regNode) => {
      const liveNode = this.nodes.get(regNode.nodeId);
      const info = liveNode?.getInfo();
      
      return {
        nodeId: regNode.nodeId,
        name: regNode.name,
        intersection: regNode.intersection,
        status: regNode.status,
        currentState: info?.currentState || "ROJO",
        timing: info?.timing || { greenDuration: 30, yellowDuration: 5, redDuration: 30 },
        lastMetrics: info?.lastMetrics || null,
        registeredAt: regNode.registeredAt,
        lastHeartbeat: regNode.lastHeartbeat,
      };
    });

    return {
      nameServerOnline: nameServer.isOnline(),
      centralServerOnline: centralServer.isOnline(),
      registeredNodes: nodesWithDetails,
      totalMessages: messageBroker.getMessageCount(),
      logs: messageBroker.getLogs().slice(-100), // Last 100 logs
      simulationRunning: this.isRunning,
      rushHourActive: this.rushHourActive,
    };
  }

  /**
   * Subscribe to state changes
   */
  onStateChange(listener: (state: SystemState) => void): () => void {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  /**
   * Notify all listeners of state change
   */
  private notifyStateChange(): void {
    const state = this.getState();
    for (const listener of this.stateListeners) {
      listener(state);
    }
  }

  /**
   * Check if simulation is running
   */
  isSimulationRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Get all nodes
   */
  getNodes(): TrafficLightNode[] {
    return Array.from(this.nodes.values());
  }

  /**
   * Reset everything
   */
  reset(): void {
    this.stop();
    messageBroker.reset();
    nameServer.reset();
    centralServer.reset();
    this.nodes.clear();
    this.rushHourActive = false;
  }
}

// Singleton instance
export const simulationManager = new SimulationManager();

// Export intersection presets for easy setup
export const INTERSECTION_PRESETS = [
  { name: "Semáforo Norte", intersection: "Av. Principal y Calle 1" },
  { name: "Semáforo Sur", intersection: "Av. Principal y Calle 5" },
  { name: "Semáforo Este", intersection: "Calle Central y Av. Comercial" },
  { name: "Semáforo Oeste", intersection: "Calle Central y Av. Residencial" },
  { name: "Semáforo Centro", intersection: "Plaza Principal" },
  { name: "Semáforo Hospital", intersection: "Av. Salud y Calle Emergencias" },
  { name: "Semáforo Escuela", intersection: "Calle Educación y Av. Juventud" },
  { name: "Semáforo Terminal", intersection: "Av. Transporte y Calle Terminal" },
];
