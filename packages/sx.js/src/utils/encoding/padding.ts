export function hexPadLeft(s: string) {
  // Remove prefix
  if (s.startsWith('0x')) {
    s = s.substring(2);
  }
  const numZeroes = 64 - s.length;
  return `0x${'0'.repeat(numZeroes) + s}`;
}

export function hexPadRight(s: string) {
  // Remove prefix
  if (s.startsWith('0x')) {
    s = s.substring(2);
  }
  // Odd length, need to prefix with a 0
  if (s.length % 2 != 0) {
    s = `0${s}`;
  }
  const numZeroes = 64 - s.length;
  return `0x${s + '0'.repeat(numZeroes)}`;
}
