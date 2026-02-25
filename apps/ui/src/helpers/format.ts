export function removeTrailingZeroes(value: number, maxDecimals: number) {
  return parseFloat(value.toFixed(maxDecimals)).toString();
}
