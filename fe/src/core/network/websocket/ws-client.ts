import { env } from "@core/config/env";
import {
  ensureValidAccessToken,
  refreshOnce,
} from "@core/network/auth-session";

type Message = unknown;
type Listener = (data: Message) => void;
type StatusListener = (status: WSStatus) => void;

export type WSStatus =
  | "idle"
  | "auth_wait"
  | "connecting"
  | "open"
  | "reconnecting"
  | "auth_failed"
  | "closed";

export class WSClient {
  private ws: WebSocket | null = null;
  private status: WSStatus = "idle";
  private listeners = new Set<Listener>();
  private statusListeners = new Set<StatusListener>();

  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private connectPromise: Promise<void> | null = null;
  private shouldRun = true;
  private manualClose = false;

  // heartbeat (message-level)
  private hbTimer: ReturnType<typeof setInterval> | null = null;
  private readonly clientPingPeriodMs = 20000; // must be < server pongWait (60s), keep it stable

  private setStatus(status: WSStatus) {
    if (this.status === status) return;
    this.status = status;
    this.statusListeners.forEach((listener) => {
      try {
        listener(status);
      } catch {
        // ignore listener errors
      }
    });
  }

  private buildUrl(token: string): string | null {
    if (!token) return null;

    const qs = new URLSearchParams({ token });
    return `${env.wsBaseUrl}?${qs}`;
  }

  async connect() {
    this.shouldRun = true;
    this.manualClose = false;

    if (this.ws && (
      this.ws.readyState === WebSocket.CONNECTING ||
      this.ws.readyState === WebSocket.OPEN
    )) {
      return;
    }

    if (this.status === "connecting" || this.status === "open") {
      return;
    }

    if (this.connectPromise) {
      return this.connectPromise;
    }

    this.connectPromise = this.openSocket();
    try {
      await this.connectPromise;
    } finally {
      this.connectPromise = null;
    }
  }

  private async openSocket() {
    this.stopReconnectTimer();

    const nextStatus = this.reconnectAttempts > 0 ? "reconnecting" : "auth_wait";
    this.setStatus(nextStatus);

    const token = await ensureValidAccessToken({ minValiditySeconds: 30 });
    if (!token) {
      this.setStatus("auth_failed");
      return;
    }

    const url = this.buildUrl(token);
    if (!url) return;

    this.setStatus("connecting");
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.setStatus("open");
      this.reconnectAttempts = 0;

      // start client heartbeat
      this.startHeartbeat();
    };

    this.ws.onmessage = (ev) => {
      // message-level heartbeat with server
      if (typeof ev.data === "string") {
        if (ev.data === "ping") {
          // reply immediately, and DO NOT emit
          try {
            this.ws?.send("pong");
          } catch {
            // ignore heartbeat reply failures
          }
          return;
        }
        if (ev.data === "pong") {
          // ignore, do not emit
          return;
        }
      }

      let payload: Message = ev.data;
      if (typeof ev.data === "string") {
        try {
          payload = JSON.parse(ev.data);
        } catch {
          payload = ev.data;
        }
      }
      this.emit(payload);
    };

    this.ws.onclose = async (ev) => {
      this.stopHeartbeat();
      const wasManual = this.manualClose;
      this.ws = null;
      this.setStatus("closed");

      if (!this.shouldRun || wasManual) {
        return;
      }

      if (this.isAuthClose(ev)) {
        const token = await refreshOnce();
        if (token) {
          await this.connect();
          return;
        }

        this.setStatus("auth_failed");
        return;
      }

      this.scheduleReconnect();
    };

    this.ws.onerror = () => {
      // onclose handles reconnect
    };
  }

  private isAuthClose(ev: CloseEvent): boolean {
    if (ev.reason === "token_expired") return true;
    return [1008, 4001, 4401, 4403].includes(ev.code);
  }

  private stopReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private scheduleReconnect() {
    if (!this.shouldRun || this.reconnectTimer) return;

    this.reconnectAttempts++;
    const backoff = Math.min(1000 * 2 ** (this.reconnectAttempts - 1), 15000);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.connect();
    }, backoff);
  }

  private stopHeartbeat() {
    if (this.hbTimer) {
      clearInterval(this.hbTimer);
      this.hbTimer = null;
    }
  }

  private startHeartbeat() {
    if (this.hbTimer) return;

    this.hbTimer = setInterval(() => {
      if (this.ws?.readyState !== WebSocket.OPEN) return;
      try {
        // client-initiated ping helps keep connection alive even if server ping is lost by proxy
        this.ws.send("ping");
      } catch {
        // ignore heartbeat send failures
      }
    }, this.clientPingPeriodMs);
  }

  send(data: unknown) {
    if (this.ws?.readyState !== WebSocket.OPEN) return;

    const msg = typeof data === "string" ? data : JSON.stringify(data);
    this.ws.send(msg);
  }

  on(fn: Listener) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  onStatus(fn: StatusListener) {
    this.statusListeners.add(fn);
    return () => this.statusListeners.delete(fn);
  }

  private emit(data: Message) {
    this.listeners.forEach((fn) => fn(data));
  }

  shutdown() {
    this.shouldRun = false;
    this.manualClose = true;
    this.reconnectAttempts = 0;
    this.stopReconnectTimer();
    this.stopHeartbeat();

    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // ignore close errors
      }
    }

    this.ws = null;
    this.setStatus("closed");
  }

  resume() {
    if (this.shouldRun && this.status === "open") return;
    this.shouldRun = true;
    this.manualClose = false;
    void this.connect();
  }

  getStatus(): WSStatus {
    return this.status;
  }
}

export const wsClient = new WSClient();
