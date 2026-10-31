import { DurableObject } from 'cloudflare:workers';
import { cleanRoomCode, MESSAGE, ROOM } from '../src/net/protocol';

interface Env {
  ROOMS: DurableObjectNamespace<Room>;
}

/** The pages the game is played on. Others can't open rooms. */
const ORIGINS = ['https://leksa-and-jumi.github.io'];
const LOCAL = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

/**
 * The server: `/room/<code>` opens the WebSocket of that room. Every room is a Durable
 * Object of its own, found by its code.
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('Origin') ?? '';
    if (!ORIGINS.includes(origin) && !LOCAL.test(origin)) {
      return new Response('Not here', { status: 403 });
    }
    const code = cleanRoomCode(new URL(request.url).pathname.replace(/^\/room\//, ''));
    if (!code) return new Response('No such room', { status: 404 });
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected a WebSocket', { status: 426 });
    }
    return env.ROOMS.get(env.ROOMS.idFromName(code)).fetch(request);
  },
} satisfies ExportedHandler<Env>;

/** Which seat a connection has. */
interface Seat {
  slot: number;
}

/**
 * One room: two seats. It only passes each player's turns on to the other, as they
 * are, and says when somebody comes or goes. Between messages it sleeps (the WebSockets
 * stay open without it), and pings are answered without waking it, so a quiet room
 * costs next to nothing.
 */
export class Room extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
  }

  override fetch(): Response {
    const open = this.ctx.getWebSockets();
    const taken = new Set(open.map((socket) => seatOf(socket)?.slot));
    const slot = [...Array(ROOM.players).keys()].find((seat) => !taken.has(seat));
    const [client, server] = Object.values(new WebSocketPair()) as [WebSocket, WebSocket];
    this.ctx.acceptWebSocket(server);
    if (slot === undefined) {
      server.send(Uint8Array.from([MESSAGE.full]));
      server.close(4000, 'full');
      return new Response(null, { status: 101, webSocket: client });
    }
    server.serializeAttachment({ slot } satisfies Seat);
    server.send(Uint8Array.from([MESSAGE.welcome, slot]));
    const everybody = [...open, server];
    if (everybody.length === ROOM.players) {
      // All seats taken: a new game starts for everybody, from the same seed
      const seed = crypto.getRandomValues(new Uint32Array(1))[0] ?? 1;
      const start = Uint8Array.from([
        MESSAGE.start,
        seed >>> 24,
        (seed >>> 16) & 0xff,
        (seed >>> 8) & 0xff,
        seed & 0xff,
      ]);
      for (const socket of everybody) socket.send(start);
    }
    return new Response(null, { status: 101, webSocket: client });
  }

  override webSocketMessage(socket: WebSocket, message: string | ArrayBuffer): void {
    if (typeof message === 'string') return;
    for (const other of this.ctx.getWebSockets()) {
      if (other !== socket) other.send(message);
    }
  }

  override webSocketClose(socket: WebSocket, code: number): void {
    this.leave(socket);
    try {
      socket.close(code === 1005 ? 1000 : code, 'bye');
    } catch {
      // Already closed
    }
  }

  override webSocketError(socket: WebSocket): void {
    this.leave(socket);
  }

  /** Tell the one left behind that the other player has gone. */
  private leave(socket: WebSocket): void {
    const seat = seatOf(socket);
    if (!seat) return;
    for (const other of this.ctx.getWebSockets()) {
      if (other !== socket) other.send(Uint8Array.from([MESSAGE.left, seat.slot]));
    }
  }
}

function seatOf(socket: WebSocket): Seat | null {
  return (socket.deserializeAttachment() as Seat | null) ?? null;
}
