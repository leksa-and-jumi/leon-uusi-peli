import { ROOM, type FrameInput, type TurnInput } from './protocol';

const NOTHING: FrameInput = { keys: 0, events: [] };

/**
 * Both players' computers play the same game, frame by frame, in step. A frame can
 * only be played once everybody's input for its turn has come. What a player does
 * is played `delay` turns later, so that it has time to get to the others: the first
 * turns have no input from anybody.
 */
export class Lockstep {
  /** The next frame to play. */
  frame = 0;
  private readonly turns = new Map<number, (TurnInput | undefined)[]>();

  constructor(
    readonly players: number = ROOM.players,
    readonly turnFrames: number = ROOM.turnFrames,
    readonly delay: number = ROOM.delayTurns,
  ) {}

  get turn(): number {
    return Math.floor(this.frame / this.turnFrames);
  }

  /** The frame is the last one of its turn: time to send the input for a later turn. */
  get endsTurn(): boolean {
    return this.frame % this.turnFrames === this.turnFrames - 1;
  }

  /** The turn that what the player does now will be played in. */
  get sendingTurn(): number {
    return this.turn + this.delay;
  }

  /** A player's input for a turn has come (or is the player's own). */
  put(input: TurnInput): void {
    if (input.turn < this.turn || input.slot >= this.players) return;
    const inputs = this.turns.get(input.turn) ?? Array<TurnInput | undefined>(this.players);
    inputs[input.slot] = input;
    this.turns.set(input.turn, inputs);
  }

  /** Can the next frame be played? */
  get ready(): boolean {
    if (this.turn < this.delay) return true;
    const inputs = this.turns.get(this.turn);
    return !!inputs && [...Array(this.players).keys()].every((slot) => inputs[slot]);
  }

  /** Every player's input for the next frame. */
  inputs(): FrameInput[] {
    const inputs = this.turns.get(this.turn);
    const at = this.frame % this.turnFrames;
    return [...Array(this.players).keys()].map((slot) => inputs?.[slot]?.frames[at] ?? NOTHING);
  }

  /** The inputs for the turn of the next frame, as they came (for checks and starting over). */
  turnInputs(): TurnInput[] {
    const inputs = this.turns.get(this.turn) ?? [];
    return inputs.filter((input): input is TurnInput => input !== undefined);
  }

  /** The frame has been played. Turns that are over are forgotten. */
  advance(): void {
    this.frame += 1;
    if (this.frame % this.turnFrames === 0) this.turns.delete(this.turn - 1);
  }
}
