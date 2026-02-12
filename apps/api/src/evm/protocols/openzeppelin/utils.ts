/**
 * Extract raw title from proposal body.
 * @param body proposal body
 * @returns raw title or null if not found
 */
export function getRawProposalTitle(body: string) {
  // Some Uniswap proposals were created with body like this.
  if (body === '""') return null;

  return body.split('\n', 1)[0]!;
}

/**
 * Extract and clean title from proposal body.
 * @param body proposal body
 * @returns cleaned title or null if not found
 */
export function getProposalTitle(body: string) {
  const rawTitle = getRawProposalTitle(body);
  return rawTitle?.replace(/^#+ +/, '').slice(0, 200) ?? null;
}

/**
 * Extract proposal body without title.
 * @param body proposal body
 * @returns body without title
 */
export function getProposalBody(body: string) {
  const title = getRawProposalTitle(body);
  if (!title) return body;

  return body.slice(title.length).trim();
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
