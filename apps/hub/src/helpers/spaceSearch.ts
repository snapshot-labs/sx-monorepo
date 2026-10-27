// Only allow complete symbols, optionally with a known voting-power prefix.
export function getSymbolSearchCandidates(search: string): string[] {
  const ticker = search.toLowerCase();
  return ticker ? [ticker, `st${ticker}`, `ve${ticker}`] : [];
}
