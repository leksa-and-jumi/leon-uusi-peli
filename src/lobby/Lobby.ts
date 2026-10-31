import './lobby.css';
import { ONLINE } from '../config';
import { NetGame, type NetPlayable, type NetStatus } from '../net/NetGame';
import { cleanRoomCode, newRoomCode } from '../net/protocol';
import { Accounts, type Invite, type Problem, type Session } from './accounts';

/** What the lobby needs from the game. */
export interface LobbyGame {
  /** The game to play online, once it has started. */
  playable(): NetPlayable | null;
  /** The lobby is open: keys go to its text boxes, not to the game. */
  typing(on: boolean): void;
}

const PROBLEMS: Record<Problem | 'full', string> = {
  name: 'Nimessä 2–12 kirjainta tai numeroa / 2–12 letters or numbers',
  pin: 'PIN on 4 numeroa / The PIN is 4 digits',
  taken: 'Nimi on jo käytössä / That name is taken',
  wrong: 'Väärä nimi tai PIN / Wrong name or PIN',
  locked: 'Liian monta yritystä, odota vähän / Too many tries, wait a while',
  session: 'Kirjaudu uudestaan / Log in again',
  network: 'Ei yhteyttä / No connection',
  full: 'Huone on täynnä / The room is full',
};

/** A new element, with a class and text. Text is always text: names can't sneak in HTML. */
function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = '',
  text = '',
): HTMLElementTagNameMap[K] {
  const made = document.createElement(tag);
  if (className) made.className = className;
  if (text) made.textContent = text;
  return made;
}

function button(text: string, className: string, onClick: () => void): HTMLButtonElement {
  const made = element('button', className, text);
  made.type = 'button';
  made.addEventListener('click', onClick);
  return made;
}

/**
 * The lobby: a card over the game. The big button plays at once. Under it is the
 * online game: logging in with a nickname and a PIN, who else is online (to invite),
 * and rooms, made or joined with a code. While in a room, a little sign in the corner
 * shows its code and how the connection is.
 */
export class Lobby {
  private readonly root = element('div', 'lobby');
  private readonly card = element('div', 'lobby-card');
  private readonly online = element('div');
  private readonly sign = element('div', 'lobby-sign');
  private readonly inviteBox = element('div', 'lobby-invite');
  private readonly accounts: Accounts;
  private net: NetGame | null = null;
  private status: NetStatus | null = null;
  private session: Session | null = null;
  private players: string[] = [];
  private invites: Invite[] = [];
  private problem = '';
  private roomProblem = '';
  private busy = false;

  constructor(private readonly game: LobbyGame) {
    this.accounts = new Accounts(
      (names) => {
        this.players = names;
        this.render();
      },
      (invites) => {
        this.invites = invites;
        this.showInvite();
      },
      (session) => {
        this.session = session;
        this.render();
      },
    );
    this.session = this.accounts.current;
    const play = button('▶  Pelaa / Play', 'play', () => {
      this.hide();
    });
    this.card.append(element('h1', '', 'Leon uusi peli'), play, this.online);
    this.root.append(this.card);
    this.root.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') this.hide();
    });
    // A click on the dark around the card closes it too
    this.root.addEventListener('click', (event) => {
      if (event.target === this.root) this.hide();
    });
    this.sign.hidden = true;
    this.inviteBox.hidden = true;
    document.body.append(this.root, this.sign, this.inviteBox);
    this.render();
    this.show();
    play.focus();
    void this.accounts.start();
  }

  show(): void {
    this.root.hidden = false;
    this.game.typing(true);
    this.renderSign();
  }

  hide(): void {
    this.root.hidden = true;
    this.game.typing(false);
    this.renderSign();
  }

  private render(): void {
    const parts: HTMLElement[] = [element('h2', '', '🌐 Netissä / Online')];
    parts.push(this.session ? this.loggedIn(this.session) : this.loginForm());
    if (this.session) parts.push(...this.playerList(this.session));
    parts.push(...this.roomPart());
    this.online.replaceChildren(...parts);
  }

  private loginForm(): HTMLElement {
    const form = element('form');
    const name = element('input');
    name.placeholder = 'Lempinimi / Nickname';
    name.maxLength = 12;
    name.autocomplete = 'username';
    const pin = element('input', 'pin');
    pin.placeholder = 'PIN';
    pin.type = 'password';
    pin.inputMode = 'numeric';
    pin.maxLength = 4;
    pin.autocomplete = 'off';
    const go = async (how: 'login' | 'register'): Promise<void> => {
      if (this.busy) return;
      this.busy = true;
      this.problem = '';
      const problem = await this.accounts[how](name.value, pin.value);
      this.busy = false;
      this.problem = problem ? PROBLEMS[problem] : '';
      this.render();
    };
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      void go('login');
    });
    const row = element('div', 'lobby-row');
    row.append(name, pin);
    const buttons = element('div', 'lobby-row');
    buttons.style.marginTop = '8px';
    const login = button('Kirjaudu / Log in', 'blue', () => void go('login'));
    login.type = 'submit';
    buttons.append(
      login,
      button('Uusi pelaaja / New player', '', () => void go('register')),
    );
    form.append(
      row,
      buttons,
      element(
        'p',
        'lobby-hint',
        'Käytä lempinimeä, älä oikeaa nimeäsi. / Use a nickname, not your real name.',
      ),
      element('p', 'lobby-problem', this.problem),
    );
    return form;
  }

  private loggedIn(session: Session): HTMLElement {
    const row = element('div', 'lobby-row');
    const hello = element('span', '', `👋 ${session.name}`);
    hello.style.flex = '1';
    row.append(
      hello,
      button('Kirjaudu ulos / Log out', '', () => {
        void this.accounts.logout();
      }),
    );
    return row;
  }

  /** Who else is online, each with a button to invite them. */
  private playerList(session: Session): HTMLElement[] {
    const others = this.players.filter((name) => name.toLowerCase() !== session.name.toLowerCase());
    const title = element('h2', '', `👥 Paikalla / Online (${String(others.length)})`);
    if (others.length === 0) {
      return [
        title,
        element('p', 'lobby-hint', 'Kukaan muu ei ole nyt paikalla. / Nobody else is online.'),
      ];
    }
    const list = element('ul', 'lobby-players');
    for (const name of others) {
      const row = element('li');
      row.append(
        element('span', '', name),
        button('Kutsu / Invite', 'blue', () => void this.invite(name)),
      );
      list.append(row);
    }
    return [title, list];
  }

  /** The room: make one or join one with a code, or the one this player is in. */
  private roomPart(): HTMLElement[] {
    const title = element('h2', '', '🚪 Huone / Room');
    const status = this.status;
    if (this.net && status) {
      const box = element('div', 'lobby-room');
      const state =
        status.state === 'playing'
          ? '🎮 Pelataan yhdessä! / Playing together!'
          : status.state === 'connecting'
            ? '⏳ Yhdistetään… / Connecting…'
            : '⏳ Odotetaan kaveria… Kerro koodi tai kutsu. / Waiting for a friend… Tell them the code or invite.';
      box.append(element('strong', '', status.code), element('p', 'lobby-hint', state));
      const buttons = element('div', 'lobby-row');
      buttons.style.justifyContent = 'center';
      if (status.state === 'playing') {
        buttons.append(
          button('▶  Peliin / To the game', 'go', () => {
            this.hide();
          }),
        );
      }
      buttons.append(
        button('Poistu / Leave', '', () => {
          this.leaveRoom();
        }),
      );
      box.append(buttons);
      return [title, box];
    }
    const code = element('input', 'code');
    code.placeholder = 'KOODI';
    code.maxLength = 4;
    code.autocapitalize = 'characters';
    const join = (): void => {
      const clean = cleanRoomCode(code.value);
      if (!clean) {
        this.roomProblem = 'Koodissa on 4 merkkiä / The code has 4 letters';
        this.render();
        return;
      }
      this.joinRoom(clean);
    };
    code.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') join();
    });
    const row = element('div', 'lobby-row');
    row.append(
      button('＋ Uusi huone / New room', 'blue', () => {
        this.joinRoom(newRoomCode());
      }),
      code,
      button('Liity / Join', '', join),
    );
    return [title, row, element('p', 'lobby-problem', this.roomProblem)];
  }

  private async invite(name: string): Promise<void> {
    if (!this.net) this.joinRoom(newRoomCode());
    const code = this.net?.code;
    if (!code) return;
    const sent = await this.accounts.invite(name, code);
    this.roomProblem = sent ? `Kutsu lähti: ${name} / Invited ${name}` : PROBLEMS.network;
    this.render();
  }

  private joinRoom(code: string): void {
    const playable = this.game.playable();
    if (!playable) return;
    this.net?.leave();
    this.roomProblem = '';
    this.net = new NetGame(ONLINE.rooms, code, playable, (status) => {
      this.status = status;
      if (status.state === 'full' || status.state === 'closed') {
        this.roomProblem = status.state === 'full' ? PROBLEMS.full : '';
        this.net = null;
        this.status = null;
      }
      // Once both are in, the game can start at once
      if (status.state === 'playing' && !this.root.hidden) this.hide();
      this.render();
      this.renderSign();
    });
    this.render();
  }

  private leaveRoom(): void {
    this.net?.leave();
    this.net = null;
    this.status = null;
    this.render();
    this.renderSign();
  }

  /** The little sign in the corner: the room and the connection, or a button to the lobby. */
  private renderSign(): void {
    const status = this.status;
    this.sign.hidden = !this.root.hidden;
    if (!status) {
      this.sign.replaceChildren(
        button('🌐', '', () => {
          this.show();
        }),
      );
      this.sign.style.paddingLeft = '6px';
      return;
    }
    this.sign.style.paddingLeft = '12px';
    const seats = status.state === 'playing' ? '👥 2/2' : '👤 1/2';
    const ping = status.pingMs === null ? '' : ` · ${String(status.pingMs)} ms`;
    const waiting = status.waitingForOther ? ' · ⏳' : '';
    this.sign.replaceChildren(
      element('span', '', `🌐 ${status.code} · ${seats}${ping}${waiting}`),
      button('☰', '', () => {
        this.show();
      }),
      button('✖', '', () => {
        this.leaveRoom();
      }),
    );
  }

  /** The first invitation waiting, at the top of the screen: join, or no thanks. */
  private showInvite(): void {
    const invite = this.invites[0];
    this.inviteBox.hidden = !invite;
    if (!invite) return;
    this.inviteBox.replaceChildren(
      element('span', '', `🎉 ${invite.from} kutsuu pelaamaan! / invites you to play!`),
      button('Liity / Join', 'yes', () => {
        void this.accounts.answer(invite.id);
        this.invites = this.invites.slice(1);
        this.showInvite();
        this.joinRoom(invite.room);
      }),
      button('Ei / No', '', () => {
        void this.accounts.answer(invite.id);
        this.invites = this.invites.slice(1);
        this.showInvite();
      }),
    );
  }
}
