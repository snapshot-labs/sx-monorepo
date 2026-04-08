export function _n(
  value: number,
  notation: 'standard' | 'compact' = 'standard',
  {
    maximumFractionDigits,
    formatDust = false
  }: { maximumFractionDigits?: number; formatDust?: boolean } = {}
) {
  if (formatDust && value > 0 && value < 0.01) return '~0';

  const formatter = new Intl.NumberFormat('en', {
    notation,
    maximumFractionDigits
  });
  return formatter.format(value).toLowerCase();
}
