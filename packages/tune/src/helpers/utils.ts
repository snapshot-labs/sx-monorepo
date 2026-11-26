export function getRandomHexColor(): string {
  return `#${Math.floor(Math.random() * 16777215)
    .toString(16)
    .padStart(6, '0')}`.toUpperCase();
}

export function omit<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  const entries = Object.entries(obj) as [K, any];

  return Object.fromEntries(entries.filter(([k]) => !keys.includes(k))) as Omit<
    T,
    K
  >;
}
