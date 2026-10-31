import { ONLINE } from '../config';

/** A logged-in player on this device: the nickname, and the token that proves it. */
export interface Session {
  name: string;
  token: string;
}

/** An invitation to a room from another player. */
export interface Invite {
  id: string;
  from: string;
  room: string;
}

export type Problem = 'name' | 'pin' | 'taken' | 'wrong' | 'locked' | 'session' | 'network';
type Answer = { ok: true; token: string; name: string } | { ok: false; problem: Problem };

const KEY = 'leon-uusi-peli.session';

/** The session kept on this device, if there is one. */
export function savedSession(): Session | null {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<Session> | null;
    return saved?.name && saved.token ? { name: saved.name, token: saved.token } : null;
  } catch {
    return null;
  }
}

function keep(session: Session | null): void {
  try {
    if (session) localStorage.setItem(KEY, JSON.stringify(session));
    else localStorage.removeItem(KEY);
  } catch {
    // Private browsing: it is only forgotten sooner
  }
}

/**
 * The player accounts, on Convex: logging in, who is online, and invitations. The
 * Convex client is only loaded when it is first needed, so the game starts just as fast.
 */
export class Accounts {
  private client: Promise<Client> | null = null;
  private session: Session | null = savedSession();
  private pulser = 0;
  private stops: (() => void)[] = [];

  constructor(
    private readonly onPlayers: (names: string[]) => void,
    private readonly onInvites: (invites: Invite[]) => void,
    private readonly onSession: (session: Session | null) => void,
  ) {}

  get current(): Session | null {
    return this.session;
  }

  /** Start: with a session kept from before, the player is online at once. */
  async start(): Promise<void> {
    if (this.session) await this.goOnline();
  }

  async register(name: string, pin: string): Promise<Problem | null> {
    return this.enter('register', name, pin);
  }

  async login(name: string, pin: string): Promise<Problem | null> {
    return this.enter('login', name, pin);
  }

  async logout(): Promise<void> {
    const session = this.session;
    this.leave();
    if (!session) return;
    try {
      const { client, api } = await this.connect();
      await client.mutation(api.accounts.logout, { token: session.token });
    } catch {
      // Offline: the server forgets the player soon anyway
    }
  }

  async invite(name: string, room: string): Promise<boolean> {
    const session = this.session;
    if (!session) return false;
    try {
      const { client, api } = await this.connect();
      const answer = await client.mutation(api.accounts.invite, {
        token: session.token,
        to: name,
        room,
      });
      return answer.ok;
    } catch {
      return false;
    }
  }

  async answer(id: string): Promise<void> {
    const session = this.session;
    if (!session) return;
    try {
      const { client, api } = await this.connect();
      await client.mutation(api.accounts.answer, { token: session.token, id: id as never });
    } catch {
      // It goes away by itself after a while
    }
  }

  private async enter(
    how: 'register' | 'login',
    name: string,
    pin: string,
  ): Promise<Problem | null> {
    try {
      const { client, api } = await this.connect();
      const answer = (await client.mutation(api.accounts[how], { name, pin })) as Answer;
      if (!answer.ok) return answer.problem;
      this.session = { name: answer.name, token: answer.token };
      keep(this.session);
      await this.goOnline();
      return null;
    } catch {
      return 'network';
    }
  }

  /** Say every so often that this player is still here, and listen for who else is. */
  private async goOnline(): Promise<void> {
    const session = this.session;
    if (!session) return;
    const { client, api } = await this.connect();
    const pulse = async (): Promise<void> => {
      if (document.visibilityState === 'hidden') return;
      try {
        const answer = await client.mutation(api.accounts.pulse, { token: session.token });
        if (!answer.ok) this.leave();
      } catch {
        // Tried again next time
      }
    };
    await pulse();
    if (!this.session) return;
    this.onSession(this.session);
    window.clearInterval(this.pulser);
    this.pulser = window.setInterval(() => void pulse(), ONLINE.pulseMs);
    this.stops.forEach((stop) => {
      stop();
    });
    this.stops = [
      client.onUpdate(api.accounts.online, {}, (names) => {
        this.onPlayers(names);
      }),
      client.onUpdate(api.accounts.invites, { token: session.token }, (invites) => {
        this.onInvites(invites.map((one) => ({ id: one.id, from: one.from, room: one.room })));
      }),
    ];
  }

  private leave(): void {
    this.session = null;
    keep(null);
    window.clearInterval(this.pulser);
    this.stops.forEach((stop) => {
      stop();
    });
    this.stops = [];
    this.onPlayers([]);
    this.onInvites([]);
    this.onSession(null);
  }

  private async connect(): Promise<Client> {
    this.client ??= (async () => {
      const [{ ConvexClient }, { api }] = await Promise.all([
        import('convex/browser'),
        import('../../convex/_generated/api'),
      ]);
      return { client: new ConvexClient(ONLINE.accounts), api };
    })();
    return this.client;
  }
}

type Client = {
  client: import('convex/browser').ConvexClient;
  api: typeof import('../../convex/_generated/api').api;
};
