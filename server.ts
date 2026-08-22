import express from 'express';
import http from 'http';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  const PORT = 3000;
  const server = http.createServer(app);

  app.use(express.json());

  // Real-time connected presence tracker
  // Map of active client IDs -> last active timestamp (for heartbeat + WebSocket)
  const activeClients = new Map<string, { lastSeen: number; training: boolean; bpm?: number }>();
  const sseClients = new Set<express.Response>();

  // WebSocket Server attached to HTTP server
  const wss = new WebSocketServer({ server, path: '/ws' });

  function getOnlineCount(): number {
    const now = Date.now();
    // Prune stale heartbeat entries older than 30 seconds
    for (const [id, data] of activeClients.entries()) {
      if (now - data.lastSeen > 30000) {
        activeClients.delete(id);
      }
    }
    // Count is unique WebSocket clients + active heartbeat sessions
    const count = Math.max(1, activeClients.size);
    return count;
  }

  function broadcastPresence() {
    const onlineCount = getOnlineCount();
    const trainingCount = Array.from(activeClients.values()).filter(c => c.training).length;
    const payload = JSON.stringify({
      type: 'presence',
      onlineCount,
      trainingCount,
      timestamp: Date.now()
    });

    // Broadcast to all WebSocket clients
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });

    // Broadcast to all SSE clients
    sseClients.forEach((res) => {
      try {
        res.write(`data: ${payload}\n\n`);
      } catch {
        sseClients.delete(res);
      }
    });
  }

  // Handle WebSocket connections
  wss.on('connection', (ws, req) => {
    const clientId = `ws_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`;
    activeClients.set(clientId, { lastSeen: Date.now(), training: false });

    // Send immediate initial count
    ws.send(JSON.stringify({
      type: 'presence',
      onlineCount: getOnlineCount(),
      trainingCount: Array.from(activeClients.values()).filter(c => c.training).length,
      clientId,
      timestamp: Date.now()
    }));

    // Broadcast updated user count to everyone
    broadcastPresence();

    // Handle messages (e.g. heartbeat, state change)
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        if (data.type === 'ping' || data.type === 'heartbeat') {
          const clientData = activeClients.get(clientId) || { lastSeen: Date.now(), training: false };
          clientData.lastSeen = Date.now();
          if (typeof data.training === 'boolean') clientData.training = data.training;
          if (typeof data.bpm === 'number') clientData.bpm = data.bpm;
          activeClients.set(clientId, clientData);
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        } else if (data.type === 'training_state') {
          const clientData = activeClients.get(clientId) || { lastSeen: Date.now(), training: false };
          clientData.training = !!data.isTraining;
          clientData.bpm = data.bpm;
          clientData.lastSeen = Date.now();
          activeClients.set(clientId, clientData);
          broadcastPresence();
        }
      } catch (e) {
        console.error('[WS] Error handling message:', e);
      }
    });

    ws.on('close', () => {
      activeClients.delete(clientId);
      broadcastPresence();
    });

    ws.on('error', () => {
      activeClients.delete(clientId);
      broadcastPresence();
    });
  });

  // REST API Endpoints for Presence (for HTTP Fallback & SSE)
  app.get('/api/presence', (req, res) => {
    const onlineCount = getOnlineCount();
    const trainingCount = Array.from(activeClients.values()).filter(c => c.training).length;
    res.json({
      onlineCount,
      trainingCount,
      timestamp: Date.now(),
      status: 'ok'
    });
  });

  // REST Heartbeat
  app.post('/api/presence/heartbeat', (req, res) => {
    const clientId = req.body?.clientId || req.ip || 'anonymous';
    const isTraining = !!req.body?.isTraining;
    const bpm = req.body?.bpm;

    activeClients.set(clientId, {
      lastSeen: Date.now(),
      training: isTraining,
      bpm
    });

    const onlineCount = getOnlineCount();
    const trainingCount = Array.from(activeClients.values()).filter(c => c.training).length;

    res.json({
      onlineCount,
      trainingCount,
      timestamp: Date.now(),
      status: 'ok'
    });

    broadcastPresence();
  });

  // Server-Sent Events (SSE) Stream
  app.get('/api/presence/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    sseClients.add(res);

    // Send initial event
    const onlineCount = getOnlineCount();
    const trainingCount = Array.from(activeClients.values()).filter(c => c.training).length;
    res.write(`data: ${JSON.stringify({ type: 'presence', onlineCount, trainingCount, timestamp: Date.now() })}\n\n`);

    req.on('close', () => {
      sseClients.delete(res);
    });
  });

  // Periodic heartbeat broadcast cleanup every 10 seconds
  setInterval(() => {
    broadcastPresence();
  }, 10000);

  // Vite Middleware for development vs Static for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Full-stack server running on http://0.0.0.0:${PORT} with WebSocket on /ws`);
  });
}

startServer().catch((err) => {
  console.error('[Server] Failed to start:', err);
  process.exit(1);
});
