/**
 * STID - Sistema de Tráfico Inteligente Distribuido
 * Main exports
 */

export * from "./types";
export { messageBroker, generateMessageId, generateNodeId } from "./message-broker";
export { nameServer, NAME_SERVER_ID } from "./name-server";
export { centralServer, CENTRAL_SERVER_ID } from "./central-server";
export { TrafficLightNode } from "./traffic-node";
export { simulationManager, INTERSECTION_PRESETS } from "./simulation";
