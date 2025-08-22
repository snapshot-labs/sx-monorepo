export function getProposalTitle(body: string) {
  // Some Uniswap proposals were created with body like this.
  if (body === '""') return null;

  const title = body.split('\n');

  return title[0] ? title[0].replace(/^#+ +/, '').slice(0, 200) : null;
}

/**
 * Convert Governor bravo choice value to common format.
 * Governor Bravo: 0=against, 1=for, 2=abstain
 * Common format uses 1 for For, 2 for Against, 3 for Abstain.
 * @param rawChoice onchain choice value
 * @returns common format choice value or null if unknown
 */
export function convertChoice(rawChoice: number): 1 | 2 | 3 | null {
  if (rawChoice === 0) return 2;
  if (rawChoice === 1) return 1;
  if (rawChoice === 2) return 3;

  return null;
}
