/**
 * STID - Central Server
 * Coordinates global traffic decisions based on metrics from all nodes
 * Implements traffic optimization algorithms
 */

import type {
  Message,
  MetricsReportPayload,
  TimingAdjustmentPayload,
  TrafficTiming,
  CameraMetrics,
  CongestionLevel,
  TrafficNode,
  TrafficLightState,
} from "./types";
import { messageBroker, generateMessageId } from "./message-broker";
import { NAME_SERVER_ID } from "./name-server";

export const CENTRAL_SERVER_ID = "central-server";

interface NodeState {
  nodeId: string;
  lastMetrics: CameraMetrics | null;
  currentTiming: TrafficTiming;
  currentState: TrafficLightState;
  lastUpdate: number;
}

/**
 * CentralServer - Global traffic coordination
 */
class CentralServer {
  private nodeStates: Map<string, NodeState> = new Map();
  private isRunning = false;
  private optimizationInterval: ReturnType<typeof setInterval> | null = null;

  // Default timing values (in seconds)
  private readonly DEFAULT_TIMING: TrafficTiming = {
    greenDuration: 30,
    yellowDuration: 5,
    redDuration: 30,
  };

  // Timing bounds
  private readonly MIN_GREEN = 15;
  private readonly MAX_GREEN = 60;
  private readonly MIN_RED = 15;
  private readonly MAX_RED = 60;

  /**
   * Start the Central Server
   */
  start(): void {
    if (this.isRunning) {
      messageBroker.log("WARN", CENTRAL_SERVER_ID, "Central Server already running");
      return;
    }

    this.isRunning = true;
    messageBroker.subscribe(CENTRAL_SERVER_ID, this.handleMessage.bind(this));

    // Run optimization every 5 seconds
    this.optimizationInterval = setInterval(() => {
      this.runGlobalOptimization();
    }, 5000);

    messageBroker.log(
      "INFO",
      CENTRAL_SERVER_ID,
      "Central Server started - Ready to coordinate traffic"
    );
  }

  /**
   * Stop the Central Server
   */
  stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    messageBroker.unsubscribe(CENTRAL_SERVER_ID);

    if (this.optimizationInterval) {
      clearInterval(this.optimizationInterval);
      this.optimizationInterval = null;
    }

    messageBroker.log("INFO", CENTRAL_SERVER_ID, "Central Server stopped");
  }

  /**
   * Handle incoming messages
   */
  private handleMessage(message: Message): void {
    switch (message.type) {
      case "METRICS_REPORT":
        this.handleMetricsReport(message);
        break;
      case "REGISTER_NODE":
        // Initialize node state when it registers
        this.initializeNodeState(message.senderId);
        break;
      default:
        // Ignore other message types
        break;
    }
  }

  /**
   * Initialize state for a new node
   */
  private initializeNodeState(nodeId: string): void {
    if (!this.nodeStates.has(nodeId)) {
      this.nodeStates.set(nodeId, {
        nodeId,
        lastMetrics: null,
        currentTiming: { ...this.DEFAULT_TIMING },
        currentState: "ROJO",
        lastUpdate: Date.now(),
      });
    }
  }

  /**
   * Handle metrics report from a traffic node
   */
  private async handleMetricsReport(message: Message): Promise<void> {
    const payload = message.payload as MetricsReportPayload;

    // Update node state
    let nodeState = this.nodeStates.get(payload.nodeId);
    if (!nodeState) {
      this.initializeNodeState(payload.nodeId);
      nodeState = this.nodeStates.get(payload.nodeId)!;
    }

    nodeState.lastMetrics = payload.metrics;
    nodeState.currentTiming = payload.currentTiming;
    nodeState.currentState = payload.currentState;
    nodeState.lastUpdate = Date.now();

    messageBroker.log(
      "DEBUG",
      CENTRAL_SERVER_ID,
      `Metrics received from ${payload.nodeId}: ${payload.metrics.vehicleCount} vehicles, congestion: ${payload.metrics.congestionLevel}`,
      payload.metrics
    );

    // Calculate and send timing adjustment if needed
    const newTiming = this.calculateOptimalTiming(payload.metrics, nodeState.currentTiming);
    
    if (this.shouldAdjustTiming(nodeState.currentTiming, newTiming)) {
      await this.sendTimingAdjustment(payload.nodeId, newTiming, payload.metrics.congestionLevel);
    }
  }

  /**
   * Calculate optimal timing based on metrics
   */
  private calculateOptimalTiming(
    metrics: CameraMetrics,
    currentTiming: TrafficTiming
  ): TrafficTiming {
    const { congestionLevel, vehicleCount, averageWaitTime } = metrics;

    let greenAdjustment = 0;
    let redAdjustment = 0;

    // Adjust based on congestion level
    switch (congestionLevel) {
      case "CRITICO":
        greenAdjustment = 15; // Increase green significantly
        redAdjustment = -10; // Decrease red
        break;
      case "ALTO":
        greenAdjustment = 10;
        redAdjustment = -5;
        break;
      case "MEDIO":
        greenAdjustment = 5;
        redAdjustment = 0;
        break;
      case "BAJO":
        greenAdjustment = -5; // Reduce green when not needed
        redAdjustment = 5;
        break;
    }

    // Additional adjustment based on wait time
    if (averageWaitTime > 60) {
      greenAdjustment += 5;
    } else if (averageWaitTime < 15) {
      greenAdjustment -= 5;
    }

    // Calculate new timings with bounds
    const newGreen = Math.min(
      this.MAX_GREEN,
      Math.max(this.MIN_GREEN, currentTiming.greenDuration + greenAdjustment)
    );
    const newRed = Math.min(
      this.MAX_RED,
      Math.max(this.MIN_RED, currentTiming.redDuration + redAdjustment)
    );

    return {
      greenDuration: newGreen,
      yellowDuration: currentTiming.yellowDuration, // Keep yellow constant
      redDuration: newRed,
    };
  }

  /**
   * Check if timing adjustment is significant enough
   */
  private shouldAdjustTiming(
    current: TrafficTiming,
    proposed: TrafficTiming
  ): boolean {
    const threshold = 3; // Only adjust if difference is > 3 seconds
    return (
      Math.abs(current.greenDuration - proposed.greenDuration) > threshold ||
      Math.abs(current.redDuration - proposed.redDuration) > threshold
    );
  }

  /**
   * Send timing adjustment to a node
   */
  private async sendTimingAdjustment(
    nodeId: string,
    newTiming: TrafficTiming,
    congestionLevel: CongestionLevel
  ): Promise<void> {
    const payload: TimingAdjustmentPayload = {
      nodeId,
      newTiming,
      reason: `Ajuste por congestión ${congestionLevel}`,
    };

    await messageBroker.send({
      id: generateMessageId(),
      type: "TIMING_ADJUSTMENT",
      senderId: CENTRAL_SERVER_ID,
      receiverId: nodeId,
      timestamp: Date.now(),
      payload,
    });

    messageBroker.log(
      "INFO",
      CENTRAL_SERVER_ID,
      `Timing adjustment sent to ${nodeId}: GREEN=${newTiming.greenDuration}s, RED=${newTiming.redDuration}s (${congestionLevel})`,
      payload
    );
  }

  /**
   * Run global optimization across all nodes
   * This considers the entire network to optimize traffic flow
   */
  private runGlobalOptimization(): void {
    const nodes = Array.from(this.nodeStates.values());
    if (nodes.length === 0) return;

    // Calculate global metrics
    const totalVehicles = nodes.reduce(
      (sum, n) => sum + (n.lastMetrics?.vehicleCount || 0),
      0
    );
    const avgCongestion = this.calculateAverageCongestion(nodes);

    if (totalVehicles > 0) {
      messageBroker.log(
        "DEBUG",
        CENTRAL_SERVER_ID,
        `Global status: ${nodes.length} nodes, ${totalVehicles} total vehicles, avg congestion: ${avgCongestion}`,
        { nodeCount: nodes.length, totalVehicles, avgCongestion }
      );
    }
  }

  /**
   * Calculate average congestion across all nodes
   */
  private calculateAverageCongestion(nodes: NodeState[]): string {
    const congestionValues: Record<CongestionLevel, number> = {
      BAJO: 1,
      MEDIO: 2,
      ALTO: 3,
      CRITICO: 4,
    };

    const nodesWithMetrics = nodes.filter((n) => n.lastMetrics);
    if (nodesWithMetrics.length === 0) return "N/A";

    const avgValue =
      nodesWithMetrics.reduce(
        (sum, n) => sum + congestionValues[n.lastMetrics!.congestionLevel],
        0
      ) / nodesWithMetrics.length;

    if (avgValue <= 1.5) return "BAJO";
    if (avgValue <= 2.5) return "MEDIO";
    if (avgValue <= 3.5) return "ALTO";
    return "CRITICO";
  }

  /**
   * Get all node states (for dashboard)
   */
  getNodeStates(): Map<string, NodeState> {
    return new Map(this.nodeStates);
  }

  /**
   * Convert to TrafficNode format for UI
   */
  getTrafficNodes(): TrafficNode[] {
    return Array.from(this.nodeStates.values()).map((state) => ({
      nodeId: state.nodeId,
      name: state.nodeId, // Will be updated with actual name
      intersection: "Unknown",
      status: messageBroker.isConnected(state.nodeId) ? "ONLINE" : "OFFLINE",
      currentState: state.currentState,
      timing: state.currentTiming,
      lastMetrics: state.lastMetrics,
      registeredAt: 0,
      lastHeartbeat: state.lastUpdate,
    }));
  }

  /**
   * Check if running
   */
  isOnline(): boolean {
    return this.isRunning;
  }

  /**
   * Reset the server
   */
  reset(): void {
    this.stop();
    this.nodeStates.clear();
  }
}

// Singleton instance
export const centralServer = new CentralServer();
