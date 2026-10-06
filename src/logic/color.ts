/**
 * Make a color darker (amount below 0) or lighter (amount above 0).
 * -1 gives black, 0 the same color, 1 white. Colors are numbers like 0xff8800.
 */
export function shade(color: number, amount: number): number {
  const mix = (channel: number): number => {
    const target = amount < 0 ? 0 : 255;
    const strength = Math.min(Math.abs(amount), 1);
    return Math.round(channel + (target - channel) * strength);
  };
  const red = mix((color >> 16) & 0xff);
  const green = mix((color >> 8) & 0xff);
  const blue = mix(color & 0xff);
  return (red << 16) | (green << 8) | blue;
}
