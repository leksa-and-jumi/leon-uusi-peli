/** What a doll is busy with. */
export type Activity = 'idle' | 'walk' | 'dance' | 'angry';

/**
 * A bubble is pressed: what does the doll do now? Pressing what it is doing already
 * stops it; pressing something else switches to that. A doll that is angry by nature
 * (a robot, a ninja, a knight, a zombie) goes back to being angry when its walking or
 * dancing is stopped, and only calms down when its angry bubble is switched off.
 */
export function pressActivity(
  now: Activity,
  pressed: Exclude<Activity, 'idle'>,
  angryByNature: boolean,
): Activity {
  if (now !== pressed) return pressed;
  return angryByNature && pressed !== 'angry' ? 'angry' : 'idle';
}
