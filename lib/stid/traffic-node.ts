/**
 * STID - Traffic Node (Semáforo Inteligente)
 * Autonomous traffic light node with simulated camera
 * Acts as an edge gateway that processes camera data locally
 */

import type {
  Message,
  TrafficLightState,
  TrafficTiming,
  CameraMetrics,
  CongestionLevel,
  RegisterNodePayload,
  MetricsReportPayload,
  TimingAdjustmentPayload,
} from "./types";
import { messageBroker, generateMessageId, generateNodeId } from "./message-broker";
import { NAME_SERVER_ID } from "./name-server";
import { CENTRAL_SERVER_ID } from "./central-server";

/**
 * SimulatedCamera - Generates realistic traffic metrics
 */
class SimulatedCamera {
  private baseTraffic = 10; // Base number of vehicles
  private rushHourMultiplier = 1;
  private variability = 0.3; // 30% random variability

  /**
   * Capture and process traffic data (edge computing simulation)
   */
  capture(): CameraMetrics {
    // Simulate vehicle count with variability
    const vehicleCount = Math.max(
      0,
      Math.round(
        this.baseTraffic *
          this.rushHourMultiplier *
          (1 + (Math.random() - 0.5) * this.variability * 2)
      )
    );

    // Calculate wait time based on vehicle count
    const averageWaitTime = Math.round(vehicleCount * 2.5 + Math.random() * 10);

    // Calculate queue length
    const queueLength = Math.min(vehicleCount, Math.round(vehicleCount * 0.7));

    // Determine congestion level
    const congestionLevel = this.calculateCongestion(vehicleCount, averageWaitTime);

    return {
      vehicleCount,
      averageWaitTime,
      congestionLevel,
      queueLength,
      timestamp: Date.now(),
    };
  }

  /**
   * Calculate congestion level based on metrics
   */
  private calculateCongestion(
    vehicleCount: number,
    waitTime: number
  ): CongestionLevel {
    const score = vehicleCount * 0.6 + waitTime * 0.4;

    if (score < 20) return "BAJO";
    if (score < 40) return "MEDIO";
    if (score < 60) return "ALTO";
    return "CRITICO";
  }

  /**
   * Set rush hour mode
   */
  setRushHour(enabled: boolean, multiplier = 2.5): void {
    this.rushHourMultiplier = enabled ? multiplier : 1;
  }

  /**
   * Set base traffic level
   */
  setBaseTraffic(level: number): void {
    this.baseTraffic = level;
  }
}

/**
 * TrafficLightNode - Autonomous traffic light with edge computing capabilities
 */
export class TrafficLightNode {
  readonly nodeId: string;
  readonly name: string;
  readonly intersection: string;

  private currentState: TrafficLightState = "ROJO";
  private timing: TrafficTiming = {
    greenDuration: 30,
    yellowDuration: 5,
    redDuration: 30,
  };
  private camera: SimulatedCamera;
  private isRunning = false;
  private stateTimer: ReturnType<typeof setTimeout> | null = null;
  private metricsInterval: ReturnType<typeof setInterval> | null = null;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private lastMetrics: CameraMetrics | null = null;
  private stateChangeListeners: Set<(state: TrafficLightState) => void> = new Set();

  constructor(name: string, intersection: string, nodeId?: string) {
    this.nodeId = nodeId || generateNodeId();
    this.name = name;
    this.intersection = intersection;
    this.camera = new SimulatedCamera();
  }

  /**
   * Start the traffic node
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      messageBroker.log("WARN", this.nodeId, `Node ${this.name} already running`);
      return;
    }

    this.isRunning = true;

    // Subscribe to message broker
    messageBroker.subscribe(this.nodeId, this.handleMessage.bind(this));

    // Register with NameServer
    await this.registerWithNameServer();

    // Start sending heartbeats
    this.startHeartbeat();

    // Start sending metrics
    this.startMetricsReporting();

    // Start traffic light cycle
    this.startStateCycle();

    messageBroker.log(
      "INFO",
      this.nodeId,
      `Nodo ${this.name} iniciado en intersección ${this.intersection} - Estado: ${this.currentState}`
    );
  }

  /**
   * Stop the traffic node
   */
  async stop(): Promise<void> {
    if (!this.isRunning) return;

    this.isRunning = false;

    // Unregister from NameServer
    await messageBroker.send({
      id: generateMessageId(),
      type: "UNREGISTER_NODE",
      senderId: this.nodeId,
      receiverId: NAME_SERVER_ID,
      timestamp: Date.now(),
      payload: { nodeId: this.nodeId },
    });

    // Stop all intervals and timers
    if (this.stateTimer) clearTimeout(this.stateTimer);
    if (this.metricsInterval) clearInterval(this.metricsInterval);
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);

    // Unsubscribe from message broker
    messageBroker.unsubscribe(this.nodeId);

    messageBroker.log(
      "INFO",
      this.nodeId,
      `Nodo ${this.name} detenido - Desconectado de la red`
    );
  }

  /**
   * Register with NameServer
   */
  private async registerWithNameServer(): Promise<void> {
    const payload: RegisterNodePayload = {
      nodeId: this.nodeId,
      name: this.name,
      intersection: this.intersection,
    };

    await messageBroker.send({
      id: generateMessageId(),
      type: "REGISTER_NODE",
      senderId: this.nodeId,
      receiverId: NAME_SERVER_ID,
      timestamp: Date.now(),
      payload,
    });

    // Also notify central server
    await messageBroker.send({
      id: generateMessageId(),
      type: "REGISTER_NODE",
      senderId: this.nodeId,
      receiverId: CENTRAL_SERVER_ID,
      timestamp: Date.now(),
      payload,
    });
  }

  /**
   * Start heartbeat sending
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(async () => {
      if (!this.isRunning) return;

      await messageBroker.send({
        id: generateMessageId(),
        type: "HEARTBEAT",
        senderId: this.nodeId,
        receiverId: NAME_SERVER_ID,
        timestamp: Date.now(),
        payload: { nodeId: this.nodeId },
      });
    }, 3000); // Every 3 seconds
  }

  /**
   * Start metrics reporting to central server
   */
  private startMetricsReporting(): void {
    this.metricsInterval = setInterval(async () => {
      if (!this.isRunning) return;

      // Capture metrics from simulated camera (edge processing)
      this.lastMetrics = this.camera.capture();

      const payload: MetricsReportPayload = {
        nodeId: this.nodeId,
        metrics: this.lastMetrics,
        currentState: this.currentState,
        currentTiming: this.timing,
      };

      await messageBroker.send({
        id: generateMessageId(),
        type: "METRICS_REPORT",
        senderId: this.nodeId,
        receiverId: CENTRAL_SERVER_ID,
        timestamp: Date.now(),
        payload,
      });

      messageBroker.log(
        "DEBUG",
        this.nodeId,
        `[${this.name}] Métricas enviadas: ${this.lastMetrics.vehicleCount} vehículos, congestión: ${this.lastMetrics.congestionLevel}, estado: ${this.currentState}`
      );
    }, 2000); // Every 2 seconds
  }

  /**
   * Start the traffic light state cycle
   */
  private startStateCycle(): void {
    this.scheduleNextState();
  }

  /**
   * Schedule the next state transition
   */
  private scheduleNextState(): void {
    if (!this.isRunning) return;

    let duration: number;
    let nextState: TrafficLightState;

    switch (this.currentState) {
      case "VERDE":
        duration = this.timing.greenDuration * 1000;
        nextState = "AMARILLO";
        break;
      case "AMARILLO":
        duration = this.timing.yellowDuration * 1000;
        nextState = "ROJO";
        break;
      case "ROJO":
        duration = this.timing.redDuration * 1000;
        nextState = "VERDE";
        break;
    }

    this.stateTimer = setTimeout(() => {
      this.transitionToState(nextState);
    }, duration);
  }

  /**
   * Transition to a new state
   */
  private transitionToState(newState: TrafficLightState): void {
    const previousState = this.currentState;
    this.currentState = newState;

    messageBroker.log(
      "INFO",
      this.nodeId,
      `[${this.name}] Cambio de estado: ${previousState} -> ${newState} (Duración ${this.getStateDuration(newState)}s)`
    );

    // Notify listeners
    for (const listener of this.stateChangeListeners) {
      listener(newState);
    }

    // Schedule next transition
    this.scheduleNextState();
  }

  /**
   * Get duration for a state
   */
  private getStateDuration(state: TrafficLightState): number {
    switch (state) {
      case "VERDE":
        return this.timing.greenDuration;
      case "AMARILLO":
        return this.timing.yellowDuration;
      case "ROJO":
        return this.timing.redDuration;
    }
  }

  /**
   * Handle incoming messages
   */
  private handleMessage(message: Message): void {
    switch (message.type) {
      case "TIMING_ADJUSTMENT":
        this.handleTimingAdjustment(message);
        break;
      case "ACK":
        // Registration confirmed
        messageBroker.log(
          "DEBUG",
          this.nodeId,
          `[${this.name}] Registro confirmado por ${message.senderId}`
        );
        break;
      default:
        break;
    }
  }

  /**
   * Handle timing adjustment from central server
   */
  private handleTimingAdjustment(message: Message): void {
    const payload = message.payload as TimingAdjustmentPayload;

    const oldTiming = { ...this.timing };
    this.timing = payload.newTiming;

    messageBroker.log(
      "INFO",
      this.nodeId,
      `[${this.name}] Tiempos ajustados por servidor central: VERDE=${payload.newTiming.greenDuration}s, ROJO=${payload.newTiming.redDuration}s (${payload.reason})`,
      { oldTiming, newTiming: payload.newTiming }
    );
  }

  /**
   * Set rush hour mode
   */
  setRushHour(enabled: boolean, multiplier?: number): void {
    this.camera.setRushHour(enabled, multiplier);
    messageBroker.log(
      "INFO",
      this.nodeId,
      `[${this.name}] Modo hora pico: ${enabled ? "ACTIVADO" : "DESACTIVADO"}`
    );
  }

  /**
   * Set base traffic level
   */
  setBaseTraffic(level: number): void {
    this.camera.setBaseTraffic(level);
  }

  /**
   * Add state change listener
   */
  onStateChange(listener: (state: TrafficLightState) => void): () => void {
    this.stateChangeListeners.add(listener);
    return () => this.stateChangeListeners.delete(listener);
  }

  /**
   * Get current state
   */
  getState(): TrafficLightState {
    return this.currentState;
  }

  /**
   * Get current timing
   */
  getTiming(): TrafficTiming {
    return { ...this.timing };
  }

  /**
   * Get last metrics
   */
  getLastMetrics(): CameraMetrics | null {
    return this.lastMetrics;
  }

  /**
   * Check if running
   */
  isOnline(): boolean {
    return this.isRunning;
  }

  /**
   * Get node info
   */
  getInfo() {
    return {
      nodeId: this.nodeId,
      name: this.name,
      intersection: this.intersection,
      currentState: this.currentState,
      timing: this.timing,
      lastMetrics: this.lastMetrics,
      isRunning: this.isRunning,
    };
  }
}
