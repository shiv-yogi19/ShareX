/**
 * ShareX Cloudflare Worker — Production WebRTC Signaling Server
 * Coordinates WebRTC offers, answers, ICE candidates, and temporary pairing rooms.
 * ZERO file bytes allowed. Storage-free direct P2P transport.
 */

import { CONFIG } from './configuration.js';

// In-Memory active rooms map: roomCode -> { created: timestamp, peers: Map(peerId -> websocket), messages: [] }
const rooms = new Map();
const ipRateLimits = new Map();

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. CORS Preflight
    if (request.method === 'OPTIONS') {
      return handleCors();
    }

    // 2. IP Rate Limiting Check
    const clientIp = request.headers.get('CF-Connecting-IP') || '127.0.0.1';
    if (isRateLimited(clientIp)) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Try again later.' }), {
        status: 429,
        headers: getHeaders({ 'Content-Type': 'application/json' })
      });
    }

    // Periodic room cleanup
    cleanupStaleRooms();

    // 3. WebSocket Upgrade Route: /ws or query param ?room=...
    if (request.headers.get('Upgrade') === 'websocket') {
      const roomCode = url.searchParams.get('room') || 'default';
      const peerId = url.searchParams.get('peer') || ('peer_' + Math.random().toString(36).substr(2, 6));

      return handleWebSocket(request, roomCode, peerId);
    }

    // 4. HTTP API Endpoints (Fallback Signaling)
    if (url.pathname === '/api/signal' && request.method === 'POST') {
      return handleHttpSignal(request);
    }

    if (url.pathname === '/api/poll' && request.method === 'GET') {
      const roomCode = url.searchParams.get('room');
      const peerId = url.searchParams.get('peer');
      return handleHttpPoll(roomCode, peerId);
    }

    if (url.pathname === '/api/health') {
      return new Response(JSON.stringify({
        status: 'online',
        activeRooms: rooms.size,
        service: 'ShareX Signaling Worker'
      }), {
        headers: getHeaders({ 'Content-Type': 'application/json' })
      });
    }

    // Default info response
    return new Response(JSON.stringify({
      name: 'ShareX WebRTC Signaling Worker',
      version: '1.0.0',
      description: 'Zero-storage WebRTC coordination endpoint for ShareX P2P'
    }), {
      headers: getHeaders({ 'Content-Type': 'application/json' })
    });
  }
};

/**
 * Handles WebSocket Connection & Message Relaying
 */
function handleWebSocket(request, roomCode, peerId) {
  const webSocketPair = new WebSocketPair();
  const [client, server] = Object.values(webSocketPair);

  server.accept();

  // Get or create room
  let room = rooms.get(roomCode);
  if (!room) {
    room = {
      created: Date.now(),
      peers: new Map(),
      messages: []
    };
    rooms.set(roomCode, room);
  }

  // Check peer capacity
  if (room.peers.size >= CONFIG.MAX_PEERS_PER_ROOM && !room.peers.has(peerId)) {
    server.send(JSON.stringify({ type: 'error', message: 'Room is full (max 2 peers)' }));
    server.close(1008, 'Room Full');
    return new Response(null, { status: 101, webSocket: client });
  }

  // Register peer socket
  room.peers.set(peerId, server);

  server.addEventListener('message', (event) => {
    try {
      // Security: Disallow large payloads (files must never pass through worker!)
      if (typeof event.data === 'string' && event.data.length > 65536) {
        server.send(JSON.stringify({ type: 'error', message: 'Payload exceeded 64KB signaling limit' }));
        return;
      }

      const data = JSON.parse(event.data);
      data.from = peerId;
      data.room = roomCode;

      // Broadcast to other peer in the room
      for (const [otherPeerId, otherSocket] of room.peers.entries()) {
        if (otherPeerId !== peerId) {
          otherSocket.send(JSON.stringify(data));
        }
      }
    } catch (err) {
      server.send(JSON.stringify({ type: 'error', message: 'Invalid JSON message' }));
    }
  });

  const cleanupPeer = () => {
    if (room.peers.has(peerId)) {
      room.peers.delete(peerId);
      // Notify other peer
      for (const [otherPeerId, otherSocket] of room.peers.entries()) {
        otherSocket.send(JSON.stringify({ type: 'leave', from: peerId, room: roomCode }));
      }
    }
    if (room.peers.size === 0) {
      rooms.delete(roomCode);
    }
  };

  server.addEventListener('close', cleanupPeer);
  server.addEventListener('error', cleanupPeer);

  return new Response(null, {
    status: 101,
    webSocket: client
  });
}

/**
 * HTTP Signaling Fallback (POST /api/signal)
 */
async function handleHttpSignal(request) {
  try {
    const data = await request.json();
    const { room: roomCode, from: peerId } = data;

    if (!roomCode || !peerId) {
      return new Response(JSON.stringify({ error: 'Missing room or from identifier' }), {
        status: 400,
        headers: getHeaders({ 'Content-Type': 'application/json' })
      });
    }

    let room = rooms.get(roomCode);
    if (!room) {
      room = { created: Date.now(), peers: new Map(), messages: [] };
      rooms.set(roomCode, room);
    }

    room.messages.push({
      id: 'msg_' + Date.now(),
      from: peerId,
      timestamp: Date.now(),
      payload: data
    });

    // Retain only last 30 messages
    if (room.messages.length > 30) room.messages.shift();

    return new Response(JSON.stringify({ success: true }), {
      headers: getHeaders({ 'Content-Type': 'application/json' })
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Bad Request' }), {
      status: 400,
      headers: getHeaders({ 'Content-Type': 'application/json' })
    });
  }
}

/**
 * HTTP Polling Fallback (GET /api/poll)
 */
function handleHttpPoll(roomCode, peerId) {
  if (!roomCode || !peerId) {
    return new Response(JSON.stringify({ error: 'Missing parameters' }), {
      status: 400,
      headers: getHeaders({ 'Content-Type': 'application/json' })
    });
  }

  const room = rooms.get(roomCode);
  if (!room) {
    return new Response(JSON.stringify({ messages: [] }), {
      headers: getHeaders({ 'Content-Type': 'application/json' })
    });
  }

  // Get messages not from self
  const pending = room.messages.filter(m => m.from !== peerId);

  return new Response(JSON.stringify({ messages: pending.map(m => m.payload) }), {
    headers: getHeaders({ 'Content-Type': 'application/json' })
  });
}

/**
 * Cleans up expired rooms
 */
function cleanupStaleRooms() {
  const now = Date.now();
  const maxAge = CONFIG.ROOM_EXPIRATION_SECONDS * 1000;

  for (const [code, room] of rooms.entries()) {
    if (now - room.created > maxAge) {
      for (const socket of room.peers.values()) {
        try {
          socket.close(1000, 'Room Expired');
        } catch (e) {}
      }
      rooms.delete(code);
    }
  }
}

function isRateLimited(ip) {
  const now = Date.now();
  const record = ipRateLimits.get(ip) || { count: 0, resetTime: now + 60000 };

  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + 60000;
  } else {
    record.count++;
  }

  ipRateLimits.set(ip, record);
  return record.count > CONFIG.RATE_LIMIT_PER_MINUTE;
}

function handleCors() {
  return new Response(null, {
    status: 204,
    headers: getHeaders()
  });
}

function getHeaders(extra = {}) {
  return {
    'Access-Control-Allow-Origin': CONFIG.CORS_ORIGIN,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    ...extra
  };
}
