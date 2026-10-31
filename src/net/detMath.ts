/**
 * Math that comes out exactly the same in every browser. `Math.sin` and its friends
 * may round their very last bit differently from one browser to the next, and in an
 * online game where both players' computers play the same game, one bit is enough
 * for the two games to drift apart. These are made of nothing but `+ - * /`, which
 * every browser does in exactly the same way (the formulas are the ones of fdlibm).
 */

const PI = 3.141592653589793;
const HALF_PI = 1.5707963267948966;

// sin and cos: the turn is cut down to a quarter around 0, then a polynomial
const PIO2_1 = 1.5707963267341256;
const PIO2_2 = 6.077100506303966e-11;
const PIO2_3 = 2.0222662487111665e-21;
const INV_PIO2 = 0.6366197723675814;
const S1 = -1.6666666666666632e-1;
const S2 = 8.333333333322489e-3;
const S3 = -1.984126982985795e-4;
const S4 = 2.7557313707070068e-6;
const S5 = -2.5050760253406863e-8;
const S6 = 1.5896909952115501e-10;
const C1 = 4.16666666666666e-2;
const C2 = -1.388888888887411e-3;
const C3 = 2.480158728947673e-5;
const C4 = -2.7557314351390663e-7;
const C5 = 2.087572321298175e-9;
const C6 = -1.1359647557788195e-11;

function kernelSin(x: number): number {
  const z = x * x;
  return x + x * z * (S1 + z * (S2 + z * (S3 + z * (S4 + z * (S5 + z * S6)))));
}

function kernelCos(x: number): number {
  const z = x * x;
  return 1 - 0.5 * z + z * z * (C1 + z * (C2 + z * (C3 + z * (C4 + z * (C5 + z * C6)))));
}

/** The quarter turn `x` is in, and how far into it. */
function reduce(x: number): [number, number] {
  const n = Math.round(x * INV_PIO2);
  const r = x - n * PIO2_1 - n * PIO2_2 - n * PIO2_3;
  return [((n % 4) + 4) % 4, r];
}

export function sin(x: number): number {
  if (!Number.isFinite(x)) return NaN;
  const [quarter, r] = reduce(x);
  switch (quarter) {
    case 0:
      return kernelSin(r);
    case 1:
      return kernelCos(r);
    case 2:
      return -kernelSin(r);
    default:
      return -kernelCos(r);
  }
}

export function cos(x: number): number {
  if (!Number.isFinite(x)) return NaN;
  const [quarter, r] = reduce(x);
  switch (quarter) {
    case 0:
      return kernelCos(r);
    case 1:
      return -kernelSin(r);
    case 2:
      return -kernelCos(r);
    default:
      return kernelSin(r);
  }
}

export function tan(x: number): number {
  return sin(x) / cos(x);
}

const ATAN_HI = [
  4.6364760900080609e-1, 7.8539816339744828e-1, 9.8279372324732905e-1, 1.5707963267948966,
];
const ATAN_LO = [
  2.2698777452961687e-17, 3.061616997868383e-17, 1.3903311031230998e-17, 6.123233995736766e-17,
];
const AT = [
  3.333333333333293e-1, -1.9999999999876483e-1, 1.4285714272503466e-1, -1.1111110405462356e-1,
  9.090887133436507e-2, -7.69187620504483e-2, 6.661073137387531e-2, -5.833570133790573e-2,
  4.976877994615932e-2, -3.6531572744216916e-2, 1.6285820115365782e-2,
];

function at(index: number): number {
  return AT[index] ?? 0;
}

export function atan(x: number): number {
  if (Number.isNaN(x)) return NaN;
  const sign = x < 0 ? -1 : 1;
  let a = Math.abs(x);
  if (a >= 7.37e19) return sign * HALF_PI;
  let id = -1;
  if (a < 0.4375) {
    if (a < 3.725290298461914e-9) return x;
  } else if (a < 1.1875) {
    if (a < 0.6875) {
      id = 0;
      a = (2 * a - 1) / (2 + a);
    } else {
      id = 1;
      a = (a - 1) / (a + 1);
    }
  } else if (a < 2.4375) {
    id = 2;
    a = (a - 1.5) / (1 + 1.5 * a);
  } else {
    id = 3;
    a = -1 / a;
  }
  const z = a * a;
  const w = z * z;
  const s1 = z * (at(0) + w * (at(2) + w * (at(4) + w * (at(6) + w * (at(8) + w * at(10))))));
  const s2 = w * (at(1) + w * (at(3) + w * (at(5) + w * (at(7) + w * at(9)))));
  if (id < 0) return sign * (a - a * (s1 + s2));
  return sign * ((ATAN_HI[id] ?? 0) - (a * (s1 + s2) - (ATAN_LO[id] ?? 0) - a));
}

export function atan2(y: number, x: number): number {
  if (Number.isNaN(x) || Number.isNaN(y)) return NaN;
  if (x === 0) {
    if (y > 0) return HALF_PI;
    if (y < 0) return -HALF_PI;
    // Both zero: like Math.atan2, minus signs count
    const leftward = Object.is(x, -0);
    if (Object.is(y, -0)) return leftward ? -PI : -0;
    return leftward ? PI : y;
  }
  const turn = atan(y / x);
  if (x > 0) return turn;
  return y < 0 || Object.is(y, -0) ? turn - PI : turn + PI;
}

export function asin(x: number): number {
  if (x > 1 || x < -1) return NaN;
  return atan2(x, Math.sqrt(1 - x * x));
}

export function acos(x: number): number {
  if (x > 1 || x < -1) return NaN;
  return atan2(Math.sqrt(1 - x * x), x);
}

// exp and log
const LN2_HI = 6.931471803691238e-1;
const LN2_LO = 1.9082149292705877e-10;
const INV_LN2 = 1.4426950408889634;
const P1 = 1.6666666666666602e-1;
const P2 = -2.7777777777015593e-3;
const P3 = 6.613756321437934e-5;
const P4 = -1.6533902205465252e-6;
const P5 = 4.1381367970572385e-8;

const bits = new DataView(new ArrayBuffer(8));

/** 2 to the power `k`, for a whole number `k` a double can hold. */
function twoTo(k: number): number {
  bits.setUint32(0, (k + 1023) << 20);
  bits.setUint32(4, 0);
  return bits.getFloat64(0);
}

/** `y` times 2 to the power `k`, also when that is very big or very small. */
function scale(y: number, k: number): number {
  if (k > 1023) return y * twoTo(1023) * twoTo(k - 1023);
  if (k < -1022) return y * twoTo(-1022) * twoTo(Math.max(k + 1022, -1022));
  return y * twoTo(k);
}

export function exp(x: number): number {
  if (Number.isNaN(x)) return NaN;
  if (x > 709.782712893384) return Infinity;
  if (x < -745.1332191019411) return 0;
  const k = Math.round(x * INV_LN2);
  const hi = x - k * LN2_HI;
  const lo = k * LN2_LO;
  const r = hi - lo;
  const t = r * r;
  const c = r - t * (P1 + t * (P2 + t * (P3 + t * (P4 + t * P5))));
  const y = 1 - (lo - (r * c) / (2 - c) - hi);
  return scale(y, k);
}

const LG = [
  6.666666666666735e-1, 3.999999999940942e-1, 2.857142874366239e-1, 2.2222198432149784e-1,
  1.818357216161805e-1, 1.5313837699209373e-1, 1.4798198605116586e-1,
];

function lg(index: number): number {
  return LG[index] ?? 0;
}

export function log(x: number): number {
  if (Number.isNaN(x) || x < 0) return NaN;
  if (x === 0) return -Infinity;
  if (x === Infinity) return Infinity;
  // Split it into a power of two and a number between 1 and 2
  let k = 0;
  let m = x;
  if (m < 2.2250738585072014e-308) {
    m *= 18014398509481984;
    k -= 54;
  }
  bits.setFloat64(0, m);
  const high = bits.getUint32(0);
  k += ((high >>> 20) & 0x7ff) - 1023;
  bits.setUint32(0, (high & 0x000fffff) | 0x3ff00000);
  m = bits.getFloat64(0);
  if (m > 1.4142135623730951) {
    m /= 2;
    k += 1;
  }
  const f = m - 1;
  const s = f / (2 + f);
  const z = s * s;
  const w = z * z;
  const t1 = w * (lg(1) + w * (lg(3) + w * lg(5)));
  const t2 = z * (lg(0) + w * (lg(2) + w * (lg(4) + w * lg(6))));
  const hfsq = 0.5 * f * f;
  return k * LN2_HI - (hfsq - (s * (hfsq + t2 + t1) + k * LN2_LO) - f);
}

export function pow(x: number, y: number): number {
  if (y === 0) return 1;
  if (Number.isNaN(x) || Number.isNaN(y)) return NaN;
  if (y === 1) return x;
  if (y === 0.5 && x >= 0) return Math.sqrt(x);
  if (Number.isInteger(y) && Math.abs(y) <= 64) {
    // Whole powers by multiplying, step by step
    let result = 1;
    let base = x;
    let left = Math.abs(y);
    while (left > 0) {
      if (left % 2 === 1) result *= base;
      base *= base;
      left = Math.floor(left / 2);
    }
    return y < 0 ? 1 / result : result;
  }
  if (x === 0) return y > 0 ? 0 : Infinity;
  if (x < 0) {
    if (!Number.isInteger(y)) return NaN;
    const odd = Math.abs(y) % 2 === 1;
    const value = exp(y * log(-x));
    return odd ? -value : value;
  }
  return exp(y * log(x));
}

export function hypot(...values: number[]): number {
  let sum = 0;
  for (const value of values) {
    if (value === Infinity || value === -Infinity) return Infinity;
    sum += value * value;
  }
  return Math.sqrt(sum);
}

/** A stream of random numbers from a seed: the same seed, the same numbers, everywhere. */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SAME_EVERYWHERE = { sin, cos, tan, atan, atan2, asin, acos, exp, log, pow, hypot };
type Swapped = keyof typeof SAME_EVERYWHERE | 'random';

/** What the game's Math has been swapped for while it plays, and what it was before. */
let swapped: { own: Record<Swapped, unknown>; saved: Record<Swapped, unknown> } | null = null;

function put(values: Record<Swapped, unknown>): void {
  const math = Math as unknown as Record<Swapped, unknown>;
  for (const name of Object.keys(values) as Swapped[]) math[name] = values[name];
}

/**
 * Run `play` with Math that comes out the same everywhere, and random numbers from
 * `random`. Everything is put back afterwards, so the rest of the page is not slowed.
 */
export function sameEverywhere<T>(random: () => number, play: () => T): T {
  const math = Math as unknown as Record<Swapped, unknown>;
  const own = { ...SAME_EVERYWHERE, random } as Record<Swapped, unknown>;
  const saved = {} as Record<Swapped, unknown>;
  for (const name of Object.keys(own) as Swapped[]) saved[name] = math[name];
  const outer = swapped;
  swapped = { own, saved };
  put(own);
  try {
    return play();
  } finally {
    put(saved);
    swapped = outer;
  }
}

/**
 * Run `show` with the page's own Math, also while the game plays: for what only this
 * player sees (their own menu), which must not use up the random numbers both games share.
 */
export function onlyHere<T>(show: () => T): T {
  const now = swapped;
  if (!now) return show();
  put(now.saved);
  swapped = null;
  try {
    return show();
  } finally {
    put(now.own);
    swapped = now;
  }
}
