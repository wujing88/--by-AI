/// <reference types="@cloudflare/workers-types" />

/**
 * Cloudflare Workers Entry Point for Rhythm Trainer
 * Supports:
 * - Real-time WebSocket connections with Hibernation API (Durable Objects)
 * - Standalone Worker WebSocketPair fallback
 * - Server-Sent Events (/api/presence/stream)
 * - REST Presence Heartbeat & Query (/api/presence, /api/presence/heartbeat)
 * - Static Assets Single Page Application serving via Cloudflare Assets
 */

interface Env {
  PRESENCE_ROOM?: DurableObjectNamespace;
  ASSETS?: Fetcher;
}

interface ClientData {
  lastSeen: number;
  isTraining: boolean;
  bpm?: number;
}

// =========================================================================
// 1. Durable Object for Global Real-time Presence (Multi-region synchronized)
// =========================================================================
export class PresenceRoom {
  private state: DurableObjectState;
  private clients = new Map<string, ClientData>();
  private sseControllers = new Set<ReadableStreamDefaultController<Uint8Array>>();

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
  }

  private getOnlineStats() {
    const now = Date.now();
    // Prune stale sessions older than 35s
    for (const [id, data] of this.clients.entries()) {
      if (now - data.lastSeen > 35000) {
        this.clients.delete(id);
      }
    }
    const wsSockets = this.state.getWebSockets ? this.state.getWebSockets() : [];
    const onlineCount = Math.max(1, Math.max(wsSockets.length, this.clients.size));
    const trainingCount = Array.from(this.clients.values()).filter(c => c.isTraining).length;

    return {
      onlineCount,
      trainingCount,
      timestamp: now,
    };
  }

  private broadcast() {
    const stats = this.getOnlineStats();
    const payload = JSON.stringify({
      type: 'presence',
      onlineCount: stats.onlineCount,
      trainingCount: stats.trainingCount,
      timestamp: stats.timestamp,
    });

    // Broadcast to hibernated WebSockets
    if (this.state.getWebSockets) {
      const sockets = this.state.getWebSockets();
      for (const ws of sockets) {
        try {
          ws.send(payload);
        } catch {
          try { ws.close(); } catch {}
        }
      }
    }

    // Broadcast to SSE streams
    const encoder = new TextEncoder();
    const sseMessage = encoder.encode(`data: ${payload}\n\n`);
    for (const controller of this.sseControllers) {
      try {
        controller.enqueue(sseMessage);
      } catch {
        this.sseControllers.delete(controller);
      }
    }
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // WebSocket Upgrade
    if (url.pathname === '/ws' || request.headers.get('Upgrade')?.toLowerCase() === 'websocket') {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);

      const clientId = `cf_ws_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`;
      this.clients.set(clientId, { lastSeen: Date.now(), isTraining: false });

      // Use modern Hibernation API
      if (this.state.acceptWebSocket) {
        this.state.acceptWebSocket(server, [clientId]);
      } else {
        server.accept();
        server.addEventListener('message', (event) => {
          this.handleWsMessage(clientId, event.data);
        });
        server.addEventListener('close', () => {
          this.clients.delete(clientId);
          this.broadcast();
        });
      }

      // Send initial presence
      const stats = this.getOnlineStats();
      server.send(JSON.stringify({
        type: 'presence',
        onlineCount: stats.onlineCount,
        trainingCount: stats.trainingCount,
        clientId,
        timestamp: Date.now(),
      }));

      this.broadcast();

      return new Response(null, {
        status: 101,
        webSocket: client,
      });
    }

    // SSE Stream endpoint
    if (url.pathname === '/api/presence/stream') {
      let currentController: ReadableStreamDefaultController<Uint8Array>;
      const stream = new ReadableStream<Uint8Array>({
        start: (controller) => {
          currentController = controller;
          this.sseControllers.add(controller);
          const stats = this.getOnlineStats();
          const encoder = new TextEncoder();
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'presence', ...stats })}\n\n`));
        },
        cancel: () => {
          if (currentController) {
            this.sseControllers.delete(currentController);
          }
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Heartbeat POST
    if (url.pathname === '/api/presence/heartbeat') {
      let body: any = {};
      try {
        body = await request.json();
      } catch {}

      const clientId = body?.clientId || request.headers.get('cf-ray') || `anon_${Date.now()}`;
      this.clients.set(clientId, {
        lastSeen: Date.now(),
        isTraining: !!body?.isTraining,
        bpm: body?.bpm,
      });

      const stats = this.getOnlineStats();
      this.broadcast();

      return new Response(JSON.stringify({ ...stats, status: 'ok' }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Presence GET
    if (url.pathname === '/api/presence') {
      const stats = this.getOnlineStats();
      return new Response(JSON.stringify({ ...stats, status: 'ok' }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    return new Response('Not Found', { status: 404 });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    const tags = this.state.getTags ? this.state.getTags(ws) : [];
    const clientId = tags[0] || 'unknown';
    this.handleWsMessage(clientId, message);
  }

  private handleWsMessage(clientId: string, message: string | ArrayBuffer) {
    try {
      const text = typeof message === 'string' ? message : new TextDecoder().decode(message);
      const data = JSON.parse(text);

      if (data.type === 'ping' || data.type === 'heartbeat') {
        const clientData = this.clients.get(clientId) || { lastSeen: Date.now(), isTraining: false };
        clientData.lastSeen = Date.now();
        if (typeof data.training === 'boolean') clientData.isTraining = data.training;
        if (typeof data.bpm === 'number') clientData.bpm = data.bpm;
        this.clients.set(clientId, clientData);
      } else if (data.type === 'training_state') {
        const clientData = this.clients.get(clientId) || { lastSeen: Date.now(), isTraining: false };
        clientData.isTraining = !!data.isTraining;
        clientData.bpm = data.bpm;
        clientData.lastSeen = Date.now();
        this.clients.set(clientId, clientData);
        this.broadcast();
      }
    } catch {}
  }

  async webSocketClose(ws: WebSocket) {
    const tags = this.state.getTags ? this.state.getTags(ws) : [];
    const clientId = tags[0];
    if (clientId) {
      this.clients.delete(clientId);
    }
    this.broadcast();
  }

  async webSocketError(ws: WebSocket) {
    const tags = this.state.getTags ? this.state.getTags(ws) : [];
    const clientId = tags[0];
    if (clientId) {
      this.clients.delete(clientId);
    }
    this.broadcast();
  }
}

// =========================================================================
// 2. Standalone Worker Direct WebSocket & Fallback Handler
// =========================================================================
const directActiveClients = new Map<string, ClientData>();
const directWebSockets = new Set<WebSocket>();

function getDirectStats() {
  const now = Date.now();
  for (const [id, data] of directActiveClients.entries()) {
    if (now - data.lastSeen > 35000) {
      directActiveClients.delete(id);
    }
  }
  return {
    onlineCount: Math.max(1, Math.max(directWebSockets.size, directActiveClients.size)),
    trainingCount: Array.from(directActiveClients.values()).filter(c => c.isTraining).length,
    timestamp: now,
  };
}

function broadcastDirect() {
  const stats = getDirectStats();
  const payload = JSON.stringify({
    type: 'presence',
    onlineCount: stats.onlineCount,
    trainingCount: stats.trainingCount,
    timestamp: stats.timestamp,
  });

  for (const ws of directWebSockets) {
    try {
      ws.send(payload);
    } catch {
      directWebSockets.delete(ws);
    }
  }
}

function handleDirectWebSocket(request: Request): Response {
  const pair = new WebSocketPair();
  const [client, server] = Object.values(pair);

  server.accept();
  directWebSockets.add(server);
  const clientId = `worker_ws_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`;
  directActiveClients.set(clientId, { lastSeen: Date.now(), isTraining: false });

  // Send initial state
  const stats = getDirectStats();
  server.send(JSON.stringify({
    type: 'presence',
    onlineCount: stats.onlineCount,
    trainingCount: stats.trainingCount,
    clientId,
    timestamp: Date.now(),
  }));

  broadcastDirect();

  server.addEventListener('message', (event) => {
    try {
      const data = JSON.parse(event.data as string);
      if (data.type === 'ping' || data.type === 'heartbeat') {
        const clientData = directActiveClients.get(clientId) || { lastSeen: Date.now(), isTraining: false };
        clientData.lastSeen = Date.now();
        if (typeof data.training === 'boolean') clientData.isTraining = data.training;
        if (typeof data.bpm === 'number') clientData.bpm = data.bpm;
        directActiveClients.set(clientId, clientData);
        server.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
      } else if (data.type === 'training_state') {
        const clientData = directActiveClients.get(clientId) || { lastSeen: Date.now(), isTraining: false };
        clientData.isTraining = !!data.isTraining;
        clientData.bpm = data.bpm;
        clientData.lastSeen = Date.now();
        directActiveClients.set(clientId, clientData);
        broadcastDirect();
      }
    } catch {}
  });

  const cleanup = () => {
    directWebSockets.delete(server);
    directActiveClients.delete(clientId);
    broadcastDirect();
  };

  server.addEventListener('close', cleanup);
  server.addEventListener('error', cleanup);

  return new Response(null, {
    status: 101,
    webSocket: client,
  });
}

// =========================================================================
// 3. Main Fetch Router
// =========================================================================
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Handle CORS Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    // 1. WebSocket Endpoint (/ws)
    if (url.pathname === '/ws' || request.headers.get('Upgrade')?.toLowerCase() === 'websocket') {
      if (env.PRESENCE_ROOM) {
        const id = env.PRESENCE_ROOM.idFromName('global_room');
        return env.PRESENCE_ROOM.get(id).fetch(request);
      }
      return handleDirectWebSocket(request);
    }

    // 2. Real-time Presence APIs (/api/presence, /api/presence/heartbeat, /api/presence/stream)
    if (url.pathname.startsWith('/api/presence')) {
      if (env.PRESENCE_ROOM) {
        const id = env.PRESENCE_ROOM.idFromName('global_room');
        return env.PRESENCE_ROOM.get(id).fetch(request);
      }

      if (url.pathname === '/api/presence/heartbeat' && request.method === 'POST') {
        let body: any = {};
        try { body = await request.json(); } catch {}
        const clientId = body?.clientId || `anon_${Date.now()}`;
        directActiveClients.set(clientId, {
          lastSeen: Date.now(),
          isTraining: !!body?.isTraining,
          bpm: body?.bpm,
        });
        const stats = getDirectStats();
        broadcastDirect();
        return new Response(JSON.stringify({ ...stats, status: 'ok' }), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }

      if (url.pathname === '/api/presence') {
        const stats = getDirectStats();
        return new Response(JSON.stringify({ ...stats, status: 'ok' }), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }
    }

    // 3. Static Assets Single Page Application (Served by Cloudflare Assets)
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response('Not Found', { status: 404 });
  },
};
