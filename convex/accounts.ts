import { v } from 'convex/values';
import type { Doc, Id } from './_generated/dataModel';
import {
  internalMutation,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from './_generated/server';

/** After this many wrong PINs in a row, logging in is locked for `LOCK_MS`. */
const MAX_FAILED = 5;
const LOCK_MS = 15 * 60 * 1000;
/** A player not seen for this long is no longer online. */
const GONE_MS = 75 * 1000;
/** An invitation is forgotten after this long. */
const INVITE_MS = 2 * 60 * 1000;

const NAME = /^[\p{L}\p{N}_-]{2,12}$/u;
const PIN = /^\d{4}$/;

/** What can go wrong, as a short code the game turns into words. */
type Problem = 'name' | 'pin' | 'taken' | 'wrong' | 'locked' | 'session';
type Answer = { ok: true; token: string; name: string } | { ok: false; problem: Problem };

function hex(bytes: ArrayBuffer | Uint8Array): string {
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function randomHex(length: number): string {
  return hex(crypto.getRandomValues(new Uint8Array(length)));
}

async function hashPin(salt: string, pin: string): Promise<string> {
  return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${salt}:${pin}`)));
}

async function startSession(ctx: MutationCtx, player: Doc<'players'>): Promise<Answer> {
  const token = randomHex(24);
  await ctx.db.insert('sessions', { player: player._id, token });
  return { ok: true, token, name: player.name };
}

async function playerOf(ctx: QueryCtx, token: string): Promise<Id<'players'> | null> {
  const session = await ctx.db
    .query('sessions')
    .withIndex('by_token', (q) => q.eq('token', token))
    .unique();
  return session?.player ?? null;
}

/** A new player: a nickname nobody has yet, and a 4-digit PIN. */
export const register = mutation({
  args: { name: v.string(), pin: v.string() },
  handler: async (ctx, { name, pin }): Promise<Answer> => {
    const clean = name.trim();
    if (!NAME.test(clean)) return { ok: false, problem: 'name' };
    if (!PIN.test(pin)) return { ok: false, problem: 'pin' };
    const key = clean.toLowerCase();
    const old = await ctx.db
      .query('players')
      .withIndex('by_key', (q) => q.eq('key', key))
      .unique();
    if (old) return { ok: false, problem: 'taken' };
    const salt = randomHex(16);
    const id = await ctx.db.insert('players', {
      name: clean,
      key,
      salt,
      pinHash: await hashPin(salt, pin),
      failed: 0,
      lockedUntil: 0,
    });
    const player = await ctx.db.get(id);
    if (!player) return { ok: false, problem: 'name' };
    return startSession(ctx, player);
  },
});

/** Log in with a nickname and its PIN. Too many wrong PINs lock it for a while. */
export const login = mutation({
  args: { name: v.string(), pin: v.string() },
  handler: async (ctx, { name, pin }): Promise<Answer> => {
    const player = await ctx.db
      .query('players')
      .withIndex('by_key', (q) => q.eq('key', name.trim().toLowerCase()))
      .unique();
    if (!player) return { ok: false, problem: 'wrong' };
    const now = Date.now();
    if (player.lockedUntil > now) return { ok: false, problem: 'locked' };
    if ((await hashPin(player.salt, pin)) !== player.pinHash) {
      const failed = player.failed + 1;
      const locked = failed >= MAX_FAILED;
      await ctx.db.patch(player._id, {
        failed: locked ? 0 : failed,
        lockedUntil: locked ? now + LOCK_MS : 0,
      });
      return { ok: false, problem: locked ? 'locked' : 'wrong' };
    }
    if (player.failed > 0) await ctx.db.patch(player._id, { failed: 0 });
    return startSession(ctx, player);
  },
});

/** Log out on this device: it is no longer online, and its token no longer works. */
export const logout = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const session = await ctx.db
      .query('sessions')
      .withIndex('by_token', (q) => q.eq('token', token))
      .unique();
    if (!session) return;
    await ctx.db.delete(session._id);
    const others = await ctx.db
      .query('sessions')
      .withIndex('by_player', (q) => q.eq('player', session.player))
      .first();
    if (!others) await goOffline(ctx, session.player);
  },
});

/**
 * Still here: a logged-in game says so every so often. The first time it also puts
 * the player on the list of who is online.
 */
export const pulse = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }): Promise<{ ok: boolean; name?: string }> => {
    const player = await playerOf(ctx, token);
    if (!player) return { ok: false };
    const doc = await ctx.db.get(player);
    if (!doc) return { ok: false };
    const now = Date.now();
    const beat = await ctx.db
      .query('pulses')
      .withIndex('by_player', (q) => q.eq('player', player))
      .unique();
    if (beat) await ctx.db.patch(beat._id, { at: now });
    else await ctx.db.insert('pulses', { player, at: now });
    const there = await ctx.db
      .query('online')
      .withIndex('by_player', (q) => q.eq('player', player))
      .unique();
    if (!there) await ctx.db.insert('online', { player, name: doc.name });
    return { ok: true, name: doc.name };
  },
});

/** The nicknames of everybody online now. */
export const online = query({
  args: {},
  handler: async (ctx): Promise<string[]> => {
    const everybody = await ctx.db.query('online').take(200);
    return everybody.map((row) => row.name).sort((a, b) => a.localeCompare(b));
  },
});

/** Invite a player who is online to a room. */
export const invite = mutation({
  args: { token: v.string(), to: v.string(), room: v.string() },
  handler: async (ctx, { token, to, room }): Promise<{ ok: boolean }> => {
    const from = await playerOf(ctx, token);
    if (!from || !/^[A-Z0-9]{4}$/.test(room)) return { ok: false };
    const sender = await ctx.db.get(from);
    const target = await ctx.db
      .query('players')
      .withIndex('by_key', (q) => q.eq('key', to.trim().toLowerCase()))
      .unique();
    if (!sender || !target || target._id === from) return { ok: false };
    // One invitation from each player at a time is enough
    const earlier = await ctx.db
      .query('invites')
      .withIndex('by_to', (q) => q.eq('to', target._id))
      .collect();
    for (const old of earlier) if (old.from === from) await ctx.db.delete(old._id);
    await ctx.db.insert('invites', {
      to: target._id,
      from,
      fromName: sender.name,
      room,
      at: Date.now(),
    });
    return { ok: true };
  },
});

/** The invitations waiting for this player. */
export const invites = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const player = await playerOf(ctx, token);
    if (!player) return [];
    const waiting = await ctx.db
      .query('invites')
      .withIndex('by_to', (q) => q.eq('to', player))
      .take(10);
    return waiting.map((one) => ({ id: one._id, from: one.fromName, room: one.room }));
  },
});

/** An invitation has been answered (yes or no): it goes away. */
export const answer = mutation({
  args: { token: v.string(), id: v.id('invites') },
  handler: async (ctx, { token, id }) => {
    const player = await playerOf(ctx, token);
    const one = await ctx.db.get(id);
    if (player && one?.to === player) await ctx.db.delete(id);
  },
});

async function goOffline(ctx: MutationCtx, player: Id<'players'>): Promise<void> {
  const there = await ctx.db
    .query('online')
    .withIndex('by_player', (q) => q.eq('player', player))
    .unique();
  if (there) await ctx.db.delete(there._id);
  const beat = await ctx.db
    .query('pulses')
    .withIndex('by_player', (q) => q.eq('player', player))
    .unique();
  if (beat) await ctx.db.delete(beat._id);
}

/** Every minute: players not seen for a while go offline, and old invitations go away. */
export const sweep = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const gone = await ctx.db
      .query('pulses')
      .withIndex('by_at', (q) => q.lt('at', now - GONE_MS))
      .take(100);
    for (const beat of gone) await goOffline(ctx, beat.player);
    const old = await ctx.db
      .query('invites')
      .withIndex('by_at', (q) => q.lt('at', now - INVITE_MS))
      .take(100);
    for (const one of old) await ctx.db.delete(one._id);
  },
});

/** Take a player away for good, with everything about them: for the grown-ups, from the Convex dashboard. */
export const remove = internalMutation({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const player = await ctx.db
      .query('players')
      .withIndex('by_key', (q) => q.eq('key', name.trim().toLowerCase()))
      .unique();
    if (!player) return false;
    await goOffline(ctx, player._id);
    const sessions = await ctx.db
      .query('sessions')
      .withIndex('by_player', (q) => q.eq('player', player._id))
      .collect();
    for (const session of sessions) await ctx.db.delete(session._id);
    const invites = await ctx.db
      .query('invites')
      .withIndex('by_to', (q) => q.eq('to', player._id))
      .collect();
    for (const one of invites) await ctx.db.delete(one._id);
    await ctx.db.delete(player._id);
    return true;
  },
});
