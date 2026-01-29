/**
 * STID - Sistema de Tráfico Inteligente Distribuido
 * Core Types and Interfaces
 */

// ============================================
// TRAFFIC LIGHT STATES
// ============================================
export type TrafficLightState = "VERDE" | "AMARILLO" | "ROJO";

// ============================================
// CONGESTION LEVELS
// ============================================
export type CongestionLevel = "BAJO" | "MEDIO" | "ALTO" | "CRITICO";

// ============================================
// NODE STATUS
// ============================================
export type NodeStatus = "ONLINE" | "OFFLINE" | "REGISTERING";

// ============================================
// MESSAGE TYPES
// ============================================
export type MessageType =
  | "REGISTER_NODE"
  | "UNREGISTER_NODE"
  | "HEARTBEAT"
  | "METRICS_REPORT"
  | "TIMING_ADJUSTMENT"
  | "NODE_DISCOVERY"
  | "ACK"
  | "NACK";

// ============================================
// INTERFACES
// ============================================

/**
 * Simulated camera metrics processed at the edge (gateway)
 */
export interface CameraMetrics {
  vehicleCount: number;
  averageWaitTime: number; // seconds
  congestionLevel: CongestionLevel;
  queueLength: number;
  timestamp: number;
}

/**
 * Traffic light timing configuration
 */
export interface TrafficTiming {
  greenDuration: number; // seconds
  yellowDuration: number; // seconds
  redDuration: number; // seconds
}

/**
 * Traffic light node information
 */
export interface TrafficNode {
  nodeId: string;
  name: string;
  intersection: string;
  status: NodeStatus;
  currentState: TrafficLightState;
  timing: TrafficTiming;
  lastMetrics: CameraMetrics | null;
  registeredAt: number;
  lastHeartbeat: number;
}

/**
 * Base message structure for all communications
 */
export interface Message {
  id: string;
  type: MessageType;
  senderId: string;
  receiverId: string;
  timestamp: number;
  payload: unknown;
}

/**
 * Node registration message payload
 */
export interface RegisterNodePayload {
  nodeId: string;
  name: string;
  intersection: string;
}

/**
 * Metrics report message payload
 */
export interface MetricsReportPayload {
  nodeId: string;
  metrics: CameraMetrics;
  currentState: TrafficLightState;
  currentTiming: TrafficTiming;
}

/**
 * Timing adjustment message payload (from central server)
 */
export interface TimingAdjustmentPayload {
  nodeId: string;
  newTiming: TrafficTiming;
  reason: string;
}

/**
 * Node discovery response payload
 */
export interface NodeDiscoveryPayload {
  nodes: Array<{
    nodeId: string;
    name: string;
    intersection: string;
    status: NodeStatus;
  }>;
}

// ============================================
// SIMULATION CONFIGURATION
// ============================================
export interface SimulationConfig {
  metricsIntervalMs: number;
  heartbeatIntervalMs: number;
  stateTransitionMs: number;
  rushHourEnabled: boolean;
  rushHourMultiplier: number;
}

// ============================================
// LOG ENTRY
// ============================================
export interface LogEntry {
  timestamp: number;
  source: string;
  level: "INFO" | "WARN" | "ERROR" | "DEBUG";
  message: string;
  data?: unknown;
}

// ============================================
// SYSTEM STATE (for dashboard)
// ============================================
export interface SystemState {
  nameServerOnline: boolean;
  centralServerOnline: boolean;
  registeredNodes: TrafficNode[];
  totalMessages: number;
  logs: LogEntry[];
  simulationRunning: boolean;
  rushHourActive: boolean;
}
