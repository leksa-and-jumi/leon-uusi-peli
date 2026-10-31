import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

/**
 * The players of the online game. A player has a nickname and a 4-digit PIN, nothing
 * else. The PIN is kept only as a salted hash.
 */
export default defineSchema({
  players: defineTable({
    name: v.string(),
    /** The nickname in lower case: no two players can have the same one. */
    key: v.string(),
    salt: v.string(),
    pinHash: v.string(),
    /** Wrong PINs in a row, and until when logging in is locked after too many. */
    failed: v.number(),
    lockedUntil: v.number(),
  }).index('by_key', ['key']),
  /** A logged-in device: the token it keeps. */
  sessions: defineTable({ player: v.id('players'), token: v.string() })
    .index('by_token', ['token'])
    .index('by_player', ['player']),
  /**
   * Who is online now: what the list of players reads. It only changes when somebody
   * comes or goes, so the list isn't sent again every time somebody is still there.
   */
  online: defineTable({ player: v.id('players'), name: v.string() }).index('by_player', ['player']),
  /** When each player was last seen: kept apart from `online`, so updating it is cheap. */
  pulses: defineTable({ player: v.id('players'), at: v.number() })
    .index('by_player', ['player'])
    .index('by_at', ['at']),
  /** An invitation to a room, from one player to another. */
  invites: defineTable({
    to: v.id('players'),
    from: v.id('players'),
    fromName: v.string(),
    room: v.string(),
    at: v.number(),
  })
    .index('by_to', ['to'])
    .index('by_at', ['at']),
});
