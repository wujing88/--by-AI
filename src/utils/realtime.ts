/**
 * Real-Time Presence & Offline/Local Mode Manager
 * Fully compatible with Cloudflare Pages (Static SPA) and Cloudflare Workers/Node (WebSocket/SSE/REST)
 */

export interface PresenceState {
  onlineCount: number;
  trainingCount: number;
  isConnected: boolean;
  isOffline: boolean;
  isFallback: boolean;
  lastUpdated: number;
}

type PresenceListener = (state: PresenceState) => void;

class RealtimePresenceManager {
  private ws: WebSocket | null = null;
  private eventSource: EventSource | null = null;
  private listeners = new Set<PresenceListener>();
  private clientId: string;
  private pingInterval: number | null = null;
  private isTraining = false;
  private currentBpm = 30;
  private reconnectTimeout: number | null = null;
  private consecutiveFailures = 0;
  
  private currentState: PresenceState = {
    onlineCount: 1,
    trainingCount: 0,
    isConnected: false,
    isOffline: typeof navigator !== 'undefined' ? !navigator.onLine : false,
    isFallback: false,
    lastUpdated: Date.now(),
  };

  constructor() {
    this.clientId = this.getOrCreateClientId();
    if (typeof window !== 'undefined') {
      this.initNetworkListeners();
      this.connect();
    }
  }

  private initNetworkListeners() {
    window.addEventListener('online', () => {
      this.consecutiveFailures = 0;
      this.updateState({ isOffline: false });
      this.connect();
    });

    window.addEventListener('offline', () => {
      this.cleanup();
      this.updateState({ isOffline: true, isConnected: false });
    });
  }

  private getOrCreateClientId(): string {
    if (typeof window === 'undefined') return 'server';
    try {
      let id = localStorage.getItem('rhythm_client_id');
      if (!id) {
        id = `usr_${Math.random().toString(36).substring(2, 10)}_${Date.now()}`;
        localStorage.setItem('rhythm_client_id', id);
      }
      return id;
    } catch {
      return `usr_${Math.random().toString(36).substring(2, 10)}`;
    }
  }

  public subscribe(listener: PresenceListener): () => void {
    this.listeners.add(listener);
    // Notify immediately with current state
    listener(this.currentState);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private updateState(partial: Partial<PresenceState>) {
    this.currentState = {
      ...this.currentState,
      ...partial,
      lastUpdated: Date.now(),
    };
    this.listeners.forEach((listener) => {
      try {
        listener(this.currentState);
      } catch (e) {
        console.error('[Realtime] Listener error:', e);
      }
    });
  }

  public getState(): PresenceState {
    return this.currentState;
  }

  public setTrainingState(isTraining: boolean, bpm: number = 30) {
    this.isTraining = isTraining;
    this.currentBpm = bpm;

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'training_state',
        isTraining,
        bpm,
      }));
    } else if (!this.currentState.isOffline) {
      this.sendHttpHeartbeat();
    }
  }

  private cleanup() {
    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }
    if (this.eventSource) {
      try {
        this.eventSource.close();
      } catch {}
      this.eventSource = null;
    }
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  private connect() {
    if (typeof window === 'undefined') return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.updateState({ isOffline: true, isConnected: false });
      return;
    }

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.consecutiveFailures = 0;
        this.updateState({ isConnected: true, isOffline: false, isFallback: false });
        
        // Send initial identify
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({
            type: 'ping',
            clientId: this.clientId,
            training: this.isTraining,
            bpm: this.currentBpm,
          }));
        }

        // Start heartbeat ping
        if (this.pingInterval) clearInterval(this.pingInterval);
        this.pingInterval = window.setInterval(() => {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
              type: 'ping',
              clientId: this.clientId,
              training: this.isTraining,
              bpm: this.currentBpm,
            }));
          }
        }, 12000);
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'presence') {
            this.updateState({
              onlineCount: Math.max(1, Number(data.onlineCount) || 1),
              trainingCount: Number(data.trainingCount) || 0,
              isConnected: true,
              isOffline: false,
            });
          }
        } catch (e) {
          console.error('[Realtime] Failed to parse message:', e);
        }
      };

      this.ws.onclose = () => {
        this.handleDisconnect();
      };

      this.ws.onerror = () => {
        this.handleDisconnect();
      };
    } catch {
      this.handleDisconnect();
    }
  }

  private handleDisconnect() {
    this.consecutiveFailures++;
    this.updateState({ isConnected: false });

    if (this.consecutiveFailures >= 2) {
      // Switch to SSE / REST fallback or detect static CF Pages mode
      this.fallbackToSSE();
    } else {
      this.scheduleReconnect();
    }
  }

  private fallbackToSSE() {
    if (typeof window === 'undefined') return;
    if (this.eventSource) return;

    try {
      this.eventSource = new EventSource('/api/presence/stream');
      this.eventSource.onopen = () => {
        this.consecutiveFailures = 0;
        this.updateState({ isConnected: true, isOffline: false, isFallback: true });
      };

      this.eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'presence') {
            this.updateState({
              onlineCount: Math.max(1, Number(data.onlineCount) || 1),
              trainingCount: Number(data.trainingCount) || 0,
              isConnected: true,
              isOffline: false,
              isFallback: true,
            });
          }
        } catch (e) {
          console.error('[Realtime SSE] Error parsing data:', e);
        }
      };

      this.eventSource.onerror = () => {
        if (this.eventSource) {
          this.eventSource.close();
          this.eventSource = null;
        }
        // Fallback to periodic HTTP polling
        this.startHttpPolling();
      };
    } catch {
      this.startHttpPolling();
    }
  }

  private startHttpPolling() {
    this.sendHttpHeartbeat();
    if (this.pingInterval) clearInterval(this.pingInterval);
    this.pingInterval = window.setInterval(() => {
      this.sendHttpHeartbeat();
    }, 10000);
  }

  private async sendHttpHeartbeat() {
    try {
      const res = await fetch('/api/presence/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: this.clientId,
          isTraining: this.isTraining,
          bpm: this.currentBpm,
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { onlineCount?: number; trainingCount?: number };
        this.consecutiveFailures = 0;
        this.updateState({
          onlineCount: Math.max(1, Number(data.onlineCount) || 1),
          trainingCount: Number(data.trainingCount) || 0,
          isConnected: true,
          isOffline: false,
          isFallback: true,
        });
      } else {
        throw new Error('API unavailable');
      }
    } catch {
      this.consecutiveFailures++;
      // If deployed purely static on Cloudflare Pages without backend or completely offline
      if (this.consecutiveFailures >= 2) {
        this.updateState({
          isOffline: true,
          isConnected: false,
        });
      }
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    this.reconnectTimeout = window.setTimeout(() => {
      this.connect();
    }, 6000);
  }
}

export const realtimePresence = new RealtimePresenceManager();
