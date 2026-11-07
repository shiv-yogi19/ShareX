/**
 * ShareX Cloudflare Worker Configuration
 */

export const CONFIG = {
  // Room expiration in seconds (default 10 minutes)
  ROOM_EXPIRATION_SECONDS: 600,

  // Maximum peers per room (ShareX is direct 1-to-1 P2P)
  MAX_PEERS_PER_ROOM: 2,

  // Maximum rate of messages per minute per IP
  RATE_LIMIT_PER_MINUTE: 120,

  // Allowed CORS origins (wildcard or specific domain)
  CORS_ORIGIN: '*',

  // Ping interval to keep WebSockets alive
  PING_INTERVAL_MS: 30000
};
