export interface RangeOptions {
  start: number;
  end: number;
  step: number;
}

export function* range(
  { start = 0, end = Number.MAX_SAFE_INTEGER, step = 1 }: Partial<RangeOptions> = {},
) {
  while (start < end) {
    yield start;
    start += step;
  }
}
 
export function randint(min: number, max: number) {
  return min + Math.round(Math.random() * 1E2) % max;
}

export function defaultRecord<K extends string | number | symbol, V>(def: V): Record<K, V> {
  return new Proxy({} as Record<K, V>, {
    get: (target, key) => target[key as K] ?? def,
  });
}
