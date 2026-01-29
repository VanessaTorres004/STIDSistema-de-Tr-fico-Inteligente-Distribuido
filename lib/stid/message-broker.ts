/**
 * STID - Message Broker
 * Simulates distributed message passing without shared memory
 * Acts as the network layer for inter-process communication
 */

import type { Message, LogEntry } from "./types";

type MessageHandler = (message: Message) => void;
type LogHandler = (entry: LogEntry) => void;

/**
 * MessageBroker - Simulates network communication between distributed nodes
 * In a real system, this would be replaced by actual network protocols (TCP/UDP, gRPC, etc.)
 */
class MessageBroker {
  private subscribers: Map<string, MessageHandler> = new Map();
  private messageQueue: Message[] = [];
  private messageCount = 0;
  private logHandlers: Set<LogHandler> = new Set();
  private logs: LogEntry[] = [];
  private networkLatencyMs = 10; // Simulated network latency

  /**
   * Subscribe a node to receive messages
   */
  subscribe(nodeId: string, handler: MessageHandler): void {
    this.subscribers.set(nodeId, handler);
    this.log("INFO", "MessageBroker", `Node ${nodeId} subscribed to message broker`);
  }

  /**
   * Unsubscribe a node from receiving messages
   */
  unsubscribe(nodeId: string): void {
    this.subscribers.delete(nodeId);
    this.log("INFO", "MessageBroker", `Node ${nodeId} unsubscribed from message broker`);
  }

  /**
   * Send a message to a specific node (simulates network delivery)
   */
  async send(message: Message): Promise<boolean> {
    this.messageCount++;
    this.messageQueue.push(message);

    // Simulate network latency
    await this.simulateLatency();

    const handler = this.subscribers.get(message.receiverId);
    if (handler) {
      try {
        handler(message);
        this.log(
          "DEBUG",
          "MessageBroker",
          `Message ${message.type} delivered: ${message.senderId} -> ${message.receiverId}`
        );
        return true;
      } catch (error) {
        this.log(
          "ERROR",
          "MessageBroker",
          `Failed to deliver message to ${message.receiverId}: ${error}`
        );
        return false;
      }
    } else {
      this.log(
        "WARN",
        "MessageBroker",
        `Node ${message.receiverId} not found. Message ${message.type} dropped.`
      );
      return false;
    }
  }

  /**
   * Broadcast a message to all subscribers (except sender)
   */
  async broadcast(message: Message): Promise<void> {
    for (const [nodeId] of this.subscribers) {
      if (nodeId !== message.senderId) {
        await this.send({ ...message, receiverId: nodeId });
      }
    }
  }

  /**
   * Simulate network latency
   */
  private simulateLatency(): Promise<void> {
    const jitter = Math.random() * 5; // 0-5ms jitter
    return new Promise((resolve) =>
      setTimeout(resolve, this.networkLatencyMs + jitter)
    );
  }

  /**
   * Get total message count
   */
  getMessageCount(): number {
    return this.messageCount;
  }

  /**
   * Get all subscribers (for discovery)
   */
  getSubscribers(): string[] {
    return Array.from(this.subscribers.keys());
  }

  /**
   * Check if a node is connected
   */
  isConnected(nodeId: string): boolean {
    return this.subscribers.has(nodeId);
  }

  /**
   * Log a message
   */
  log(
    level: LogEntry["level"],
    source: string,
    message: string,
    data?: unknown
  ): void {
    const entry: LogEntry = {
      timestamp: Date.now(),
      source,
      level,
      message,
      data,
    };
    this.logs.push(entry);
    
    // Keep only last 500 logs
    if (this.logs.length > 500) {
      this.logs = this.logs.slice(-500);
    }

    // Notify log handlers
    for (const handler of this.logHandlers) {
      handler(entry);
    }
  }

  /**
   * Subscribe to log events
   */
  onLog(handler: LogHandler): () => void {
    this.logHandlers.add(handler);
    return () => this.logHandlers.delete(handler);
  }

  /**
   * Get all logs
   */
  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * Reset the broker
   */
  reset(): void {
    this.subscribers.clear();
    this.messageQueue = [];
    this.messageCount = 0;
    this.logs = [];
  }
}

// Singleton instance
export const messageBroker = new MessageBroker();

// Utility to generate unique message IDs
export function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// Utility to generate unique node IDs
export function generateNodeId(): string {
  return `node_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
