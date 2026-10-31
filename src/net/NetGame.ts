import { sameEverywhere, seededRandom } from './detMath';
import { Lockstep } from './lockstep';
import {
  decodeTurn,
  encodeTurn,
  MESSAGE,
  quantize,
  ROOM,
  type Command,
  type FrameInput,
  type NetEvent,
} from './protocol';

/** What the game has to do for the online game. */
export interface NetPlayable {
  /** Play on by one frame. */
  simulate(delta: number): void;
  /** One frame of a player's input. */
  applyInput(slot: number, input: FrameInput): void;
  /** A new online game starts, the same for everybody. */
  startOnline(net: NetGame, players: number): void;
  /** Start over the same way as the other player: the games had drifted apart. */
  restartTogether(): void;
  /** The online game is over: play on alone. */
  stopOnline(): void;
  /** Where everything is, boiled down to one number. */
  fingerprint(): number;
  /** The keys held down on this keyboard. */
  localKeys(): number;
}

/** How the online game is going, for the lobby and the little sign in the corner. */
export interface NetStatus {
  state: 'connecting' | 'waiting' | 'playing' | 'full' | 'closed';
  code: string;
  /** This player's seat: 0 or 1, or -1 before it is known. */
  slot: number;
  /** How long a message takes there and back, in milliseconds, once it is known. */
  pingMs: number | null;
  /** The other player's turns are late: the game waits for them. */
  waitingForOther: boolean;
}

/** At most this many frames are played at once to catch up, and at most this many are owed. */
const MOST_AT_ONCE = 4;
const MOST_BEHIND = 8;

/**
 * An online game in a room: the WebSocket to the room, and playing the game in step
 * with the other player. Only what the players do goes over the network, a turn at a
 * time; both games play it the same way, with the same random numbers.
 */
export class NetGame {
  private readonly socket: WebSocket;
  private step: Lockstep | null = null;
  private random: () => number = Math.random;
  private owedMs = 0;
  /** This player's input for the turn being put together, frame by frame. */
  private outgoing: FrameInput[] = [];
  /** What this player has done since the last frame. */
  private events: NetEvent[] = [];
  private readonly ownChecks = new Map<number, number>();
  private readonly otherChecks = new Map<number, number>();
  private check: { frame: number; hash: number } | null = null;
  private startOver = false;
  private pingAt = 0;
  private pinger = 0;
  private status: NetStatus;

  constructor(
    url: string,
    code: string,
    private readonly game: NetPlayable,
    private readonly onStatus: (status: NetStatus) => void,
  ) {
    this.status = { state: 'connecting', code, slot: -1, pingMs: null, waitingForOther: false };
    this.socket = new WebSocket(`${url}/room/${code}`);
    this.socket.binaryType = 'arraybuffer';
    this.socket.onmessage = (message) => {
      this.receive(message.data as ArrayBuffer | string);
    };
    this.socket.onclose = () => {
      this.end();
      this.tell({ state: this.status.state === 'full' ? 'full' : 'closed' });
    };
    this.socket.onopen = () => {
      this.ping();
    };
    // Kept alive with a tiny message, which the server answers without waking the room
    this.pinger = window.setInterval(() => {
      this.ping();
    }, ROOM.pingMs);
    this.onStatus(this.status);
  }

  get code(): string {
    return this.status.code;
  }

  /** Leave the room: the game goes on here alone. */
  leave(): void {
    window.clearInterval(this.pinger);
    this.socket.close(1000, 'bye');
    this.end();
  }

  // What this player does, in the area: played in both games a little later
  down(x: number, y: number, touch: boolean, choice: string): void {
    this.events.push({ kind: 'down', x: quantize(x), y: quantize(y), touch, choice });
  }

  move(x: number, y: number): void {
    const last = this.events[this.events.length - 1];
    const move: NetEvent = { kind: 'move', x: quantize(x), y: quantize(y) };
    // Only where the pointer ended up in a frame matters
    if (last?.kind === 'move') this.events[this.events.length - 1] = move;
    else this.events.push(move);
  }

  up(): void {
    this.events.push({ kind: 'up' });
  }

  command(command: Command): void {
    this.events.push({ kind: 'command', command });
  }

  /** Play as many frames as there has been time for, as long as everybody's turns are in. */
  tick(deltaMs: number): void {
    const step = this.step;
    if (!step) return;
    this.owedMs = Math.min(this.owedMs + deltaMs, ROOM.frameMs * MOST_BEHIND);
    let played = 0;
    let waiting = false;
    while (this.owedMs >= ROOM.frameMs && played < MOST_AT_ONCE) {
      if (!step.ready) {
        waiting = true;
        break;
      }
      this.playFrame(step);
      this.owedMs -= ROOM.frameMs;
      played += 1;
    }
    if (waiting !== this.status.waitingForOther) this.tell({ waitingForOther: waiting });
  }

  private playFrame(step: Lockstep): void {
    const atTurn = step.frame % step.turnFrames === 0;
    if (atTurn && step.turnInputs().some((input) => input.resync)) {
      // The games had drifted apart: both start over, on this very frame
      sameEverywhere(this.random, () => {
        this.game.restartTogether();
      });
      this.ownChecks.clear();
      this.otherChecks.clear();
    }
    this.outgoing[step.frame % step.turnFrames] = {
      keys: this.game.localKeys(),
      events: this.events.splice(0),
    };
    const inputs = step.inputs();
    sameEverywhere(this.random, () => {
      inputs.forEach((input, slot) => {
        this.game.applyInput(slot, input);
      });
      this.game.simulate(ROOM.frameMs);
    });
    if (step.frame % ROOM.hashEveryFrames === 0) {
      const hash = this.game.fingerprint();
      this.ownChecks.set(step.frame, hash);
      this.check = { frame: step.frame, hash };
      this.compare(step.frame);
    }
    if (step.endsTurn) this.send(step);
    step.advance();
  }

  /** This player's input for a turn a little later: to the other player, and to this game. */
  private send(step: Lockstep): void {
    const input = {
      slot: this.status.slot,
      turn: step.sendingTurn,
      frames: this.outgoing,
      check: this.check,
      resync: this.startOver,
    };
    this.outgoing = [];
    this.check = null;
    this.startOver = false;
    step.put(input);
    if (this.socket.readyState === WebSocket.OPEN) this.socket.send(encodeTurn(input));
  }

  /** Do both games still agree about frame `frame`? If not, both start over. */
  private compare(frame: number): void {
    const own = this.ownChecks.get(frame);
    const other = this.otherChecks.get(frame);
    if (own === undefined || other === undefined) return;
    this.ownChecks.delete(frame);
    this.otherChecks.delete(frame);
    if (own !== other) this.startOver = true;
  }

  private receive(data: ArrayBuffer | string): void {
    if (typeof data === 'string') {
      if (data === 'pong' && this.pingAt > 0) {
        this.tell({ pingMs: Math.round(performance.now() - this.pingAt) });
        this.pingAt = 0;
      }
      return;
    }
    const bytes = new Uint8Array(data);
    switch (bytes[0]) {
      case MESSAGE.welcome:
        this.tell({ state: 'waiting', slot: bytes[1] ?? 0 });
        break;
      case MESSAGE.start: {
        const seed =
          (((bytes[1] ?? 0) << 24) |
            ((bytes[2] ?? 0) << 16) |
            ((bytes[3] ?? 0) << 8) |
            (bytes[4] ?? 0)) >>>
          0;
        this.begin(seed);
        break;
      }
      case MESSAGE.left:
        this.end();
        this.tell({ state: 'waiting', waitingForOther: false });
        break;
      case MESSAGE.full:
        this.tell({ state: 'full' });
        break;
      case MESSAGE.turn: {
        const input = decodeTurn(bytes);
        if (!input || !this.step) return;
        this.step.put(input);
        if (input.check) {
          this.otherChecks.set(input.check.frame, input.check.hash);
          this.compare(input.check.frame);
        }
        break;
      }
    }
  }

  /** Everybody is here: a new game starts, the same for everybody. */
  private begin(seed: number): void {
    this.random = seededRandom(seed);
    this.step = new Lockstep();
    this.outgoing = [];
    this.events = [];
    this.owedMs = 0;
    this.ownChecks.clear();
    this.otherChecks.clear();
    sameEverywhere(this.random, () => {
      this.game.startOnline(this, ROOM.players);
    });
    this.tell({ state: 'playing', waitingForOther: false });
  }

  /** Nobody to play with any more: the game goes on here alone. */
  private end(): void {
    if (!this.step) return;
    this.step = null;
    this.game.stopOnline();
  }

  private ping(): void {
    if (this.socket.readyState !== WebSocket.OPEN) return;
    this.pingAt = performance.now();
    this.socket.send('ping');
  }

  private tell(change: Partial<NetStatus>): void {
    this.status = { ...this.status, ...change };
    this.onStatus(this.status);
  }
}
