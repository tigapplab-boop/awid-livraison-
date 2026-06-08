import { createServer, IncomingMessage, ServerResponse } from 'http';
import { Server, Socket } from 'socket.io';

const SOCKET_PORT = 3003;
const EMIT_PORT = 3004;

// ========================================
// Socket.IO Server Setup
// ========================================

const httpServer = createServer();
const io = new Server(httpServer, {
  // DO NOT change the path, it is used by Caddy to forward the request to the correct port
  path: '/',
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || [
      'https://burgerminute.space-z.ai',
      'http://localhost:3000',
    ],
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// ========================================
// Room Name Helpers
// ========================================

function livreurRoom(userId: string): string {
  return `livreur:${userId}`;
}

function clientRoom(token: string): string {
  return `client:${token}`;
}

// ========================================
// Socket Connection Handling
// ========================================

io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token

  if (!token) {
    socket.data.role = 'anonymous'
    return next()
  }

  try {
    // Vérifier le token JWT via l'API Next.js
    const res = await fetch(`${process.env.API_URL || 'http://app:3000'}/api/auth/verify`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (res.ok) {
      const payload = await res.json()
      socket.data.userId = payload.userId
      socket.data.role = payload.role
      return next()
    }
    return next(new Error('Authentication failed'))
  } catch {
    return next(new Error('Authentication error'))
  }
})

io.on('connection', (socket: Socket) => {
  console.log(`[Socket] Connected: ${socket.id}`);

  // ------------------------------------------
  // Client Events: Room Join / Leave
  // ------------------------------------------

  socket.on('join:livreur', (data: { userId: string }) => {
    const { userId } = data;
    if (!userId) {
      socket.emit('error', { message: 'userId is required for join:livreur' });
      return;
    }
    
    if (socket.data.role !== 'LIVREUR' && socket.data.role !== 'ADMIN') {
      socket.emit('error', { message: 'Unauthorized' })
      return
    }
    // Vérifier que le livreur ne rejoint que SA room
    if (socket.data.role === 'LIVREUR' && socket.data.userId !== userId) {
      socket.emit('error', { message: 'Cannot join another livreur room' })
      return
    }
    
    // Join individual room (for targeted notifications)
    const room = livreurRoom(userId);
    socket.join(room);
    // Also join global "livreur" room (for broadcasts to all livreurs)
    socket.join('livreur');
    console.log(`[Socket] ${socket.id} joined rooms: ${room}, livreur`);
    socket.emit('joined', { room });
  });

  socket.on('join:admin', () => {
    if (socket.data.role !== 'ADMIN') {
      socket.emit('error', { message: 'Admin access required' })
      return
    }
    socket.join('admin');
    console.log(`[Socket] ${socket.id} joined room: admin`);
    socket.emit('joined', { room: 'admin' });
  });

  socket.on('join:cuisine', () => {
    socket.join('cuisine');
    console.log(`[Socket] ${socket.id} joined room: cuisine`);
    socket.emit('joined', { room: 'cuisine' });
  });

  socket.on('join:client', (data: { token: string }) => {
    const { token } = data;
    if (!token) {
      socket.emit('error', { message: 'token is required for join:client' });
      return;
    }
    // Auto-detect: token can be tempToken or clientToken — both join client:{token}
    const room = clientRoom(token);
    socket.join(room);
    console.log(`[Socket] ${socket.id} joined room: ${room}`);
    socket.emit('joined', { room });
  });

  socket.on('leave:client', (data: { token: string }) => {
    const { token } = data;
    if (!token) return;
    const room = clientRoom(token);
    socket.leave(room);
    console.log(`[Socket] ${socket.id} left room: ${room}`);
    socket.emit('left', { room });
  });

  // ------------------------------------------
  // Disconnect
  // ------------------------------------------

  socket.on('disconnect', (reason: string) => {
    console.log(`[Socket] Disconnected: ${socket.id} (${reason})`);
  });

  socket.on('error', (error: Error) => {
    console.error(`[Socket] Error on ${socket.id}:`, error);
  });
});

// ========================================
// Internal HTTP Endpoint: POST /emit
// ========================================
// Separate HTTP server on port 3004 for Next.js API routes to emit events
// Body: { event: string, room: string, data: any }
//
// Event routing guide:
//   order:new       → room "livreur" (broadcast to all)
//   order:updated   → room "livreur:{userId}"
//   order:validated → room "client:{token}" + "admin" + "cuisine"
//   order:rejected  → room "client:{token}"
//   order:expired   → room "client:{token}"
//   order:confirmed → room "cuisine"
//   order:ready     → room "livreur:{userId}" + "client:{token}"
//   order:status    → room "client:{token}" + "admin" + "livreur:{userId}"
//   delivery:started→ room "admin" + "client:{token}"
//   delivery:issue  → room "admin"

const EMIT_SECRET = process.env.EMIT_SECRET
if (!EMIT_SECRET || EMIT_SECRET.length < 32) {
  console.error('FATAL: EMIT_SECRET must be set and >= 32 chars')
  process.exit(1)
}

const emitServer = createServer((req: IncomingMessage, res: ServerResponse) => {
  // CORS headers for internal use
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-emit-secret');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method !== 'POST' || req.url !== '/emit') {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found. Use POST /emit' }));
    return;
  }

  const authHeader = req.headers['x-emit-secret']
  if (authHeader !== EMIT_SECRET) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Unauthorized' }));
    return;
  }

  let body = '';
  req.on('data', (chunk: Buffer) => {
    body += chunk.toString();
  });

  req.on('end', () => {
    try {
      const payload = JSON.parse(body);
      const { event, room, data } = payload;

      if (!event || !room) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing required fields: event, room' }));
        return;
      }

      // Emit to the specified room
      io.to(room).emit(event, data);
      console.log(`[Emit] event="${event}" room="${room}" data=${JSON.stringify(data).slice(0, 200)}`);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, event, room }));
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid JSON body' }));
    }
  });
});

// ========================================
// Server Start
// ========================================

httpServer.listen(SOCKET_PORT, () => {
  console.log(`[Socket.IO] Server running on port ${SOCKET_PORT}`);
  console.log(`[Socket.IO] Rooms: livreur:{userId}, admin, cuisine, client:{token}`);
});

emitServer.listen(EMIT_PORT, () => {
  console.log(`[Emit API] Internal endpoint: POST http://localhost:${EMIT_PORT}/emit`);
});

// ========================================
// Graceful Shutdown
// ========================================

function gracefulShutdown(signal: string) {
  console.log(`[Socket.IO] Received ${signal}, shutting down...`);
  io.disconnectSockets(true);
  httpServer.close(() => {
    emitServer.close(() => {
      console.log('[Socket.IO] All servers closed');
      process.exit(0);
    });
  });
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
