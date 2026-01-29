/**
 * STID - NameServer
 * Responsible for node registration and discovery
 * Acts as a service registry for the distributed system
 */

import type {
  Message,
  TrafficNode,
  RegisterNodePayload,
  NodeDiscoveryPayload,
  NodeStatus,
} from "./types";
import { messageBroker, generateMessageId } from "./message-broker";

export const NAME_SERVER_ID = "name-server";

interface RegisteredNode {
  nodeId: string;
  name: string;
  intersection: string;
  status: NodeStatus;
  registeredAt: number;
  lastHeartbeat: number;
}

/**
 * NameServer - Service registry for distributed traffic nodes
 */
class NameServer {
  private registeredNodes: Map<string, RegisteredNode> = new Map();
  private isRunning = false;
  private heartbeatCheckInterval: ReturnType<typeof setInterval> | null = null;
  private readonly HEARTBEAT_TIMEOUT_MS = 10000; // 10 seconds

  /**
   * Start the NameServer
   */
  start(): void {
    if (this.isRunning) {
      messageBroker.log("WARN", NAME_SERVER_ID, "NameServer already running");
      return;
    }

    this.isRunning = true;
    messageBroker.subscribe(NAME_SERVER_ID, this.handleMessage.bind(this));

    // Start heartbeat monitoring
    this.heartbeatCheckInterval = setInterval(() => {
      this.checkHeartbeats();
    }, 5000);

    messageBroker.log("INFO", NAME_SERVER_ID, "NameServer started - Ready for node registrations");
  }

  /**
   * Stop the NameServer
   */
  stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    messageBroker.unsubscribe(NAME_SERVER_ID);

    if (this.heartbeatCheckInterval) {
      clearInterval(this.heartbeatCheckInterval);
      this.heartbeatCheckInterval = null;
    }

    messageBroker.log("INFO", NAME_SERVER_ID, "NameServer stopped");
  }

  /**
   * Handle incoming messages
   */
  private handleMessage(message: Message): void {
    switch (message.type) {
      case "REGISTER_NODE":
        this.handleRegisterNode(message);
        break;
      case "UNREGISTER_NODE":
        this.handleUnregisterNode(message);
        break;
      case "HEARTBEAT":
        this.handleHeartbeat(message);
        break;
      case "NODE_DISCOVERY":
        this.handleNodeDiscovery(message);
        break;
      default:
        messageBroker.log(
          "WARN",
          NAME_SERVER_ID,
          `Unknown message type: ${message.type}`
        );
    }
  }

  /**
   * Handle node registration
   */
  private async handleRegisterNode(message: Message): Promise<void> {
    const payload = message.payload as RegisterNodePayload;
    const now = Date.now();

    const node: RegisteredNode = {
      nodeId: payload.nodeId,
      name: payload.name,
      intersection: payload.intersection,
      status: "ONLINE",
      registeredAt: now,
      lastHeartbeat: now,
    };

    this.registeredNodes.set(payload.nodeId, node);

    messageBroker.log(
      "INFO",
      NAME_SERVER_ID,
      `Node registered: ${payload.name} (${payload.nodeId}) at intersection ${payload.intersection}`,
      { nodeId: payload.nodeId, intersection: payload.intersection }
    );

    // Send ACK
    await messageBroker.send({
      id: generateMessageId(),
      type: "ACK",
      senderId: NAME_SERVER_ID,
      receiverId: message.senderId,
      timestamp: Date.now(),
      payload: { originalMessageId: message.id, status: "REGISTERED" },
    });
  }

  /**
   * Handle node unregistration
   */
  private async handleUnregisterNode(message: Message): Promise<void> {
    const nodeId = message.senderId;
    const node = this.registeredNodes.get(nodeId);

    if (node) {
      this.registeredNodes.delete(nodeId);
      messageBroker.log(
        "INFO",
        NAME_SERVER_ID,
        `Node unregistered: ${node.name} (${nodeId})`
      );
    }
  }

  /**
   * Handle heartbeat from node
   */
  private handleHeartbeat(message: Message): void {
    const nodeId = message.senderId;
    const node = this.registeredNodes.get(nodeId);

    if (node) {
      node.lastHeartbeat = Date.now();
      if (node.status === "OFFLINE") {
        node.status = "ONLINE";
        messageBroker.log(
          "INFO",
          NAME_SERVER_ID,
          `Node ${node.name} is back ONLINE`
        );
      }
    }
  }

  /**
   * Handle node discovery request
   */
  private async handleNodeDiscovery(message: Message): Promise<void> {
    const discoveryPayload: NodeDiscoveryPayload = {
      nodes: Array.from(this.registeredNodes.values()).map((node) => ({
        nodeId: node.nodeId,
        name: node.name,
        intersection: node.intersection,
        status: node.status,
      })),
    };

    await messageBroker.send({
      id: generateMessageId(),
      type: "NODE_DISCOVERY",
      senderId: NAME_SERVER_ID,
      receiverId: message.senderId,
      timestamp: Date.now(),
      payload: discoveryPayload,
    });
  }

  /**
   * Check heartbeats and mark offline nodes
   */
  private checkHeartbeats(): void {
    const now = Date.now();

    for (const [nodeId, node] of this.registeredNodes) {
      if (
        node.status === "ONLINE" &&
        now - node.lastHeartbeat > this.HEARTBEAT_TIMEOUT_MS
      ) {
        node.status = "OFFLINE";
        messageBroker.log(
          "WARN",
          NAME_SERVER_ID,
          `Node ${node.name} (${nodeId}) marked as OFFLINE - heartbeat timeout`,
          { nodeId, lastHeartbeat: node.lastHeartbeat }
        );
      }
    }
  }

  /**
   * Get all registered nodes
   */
  getRegisteredNodes(): RegisteredNode[] {
    return Array.from(this.registeredNodes.values());
  }

  /**
   * Get online nodes count
   */
  getOnlineNodesCount(): number {
    return Array.from(this.registeredNodes.values()).filter(
      (n) => n.status === "ONLINE"
    ).length;
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
    this.registeredNodes.clear();
  }
}

// Singleton instance
export const nameServer = new NameServer();
