type Proposal = {
  strategies: any[];
};

// Overlord pricing service is retired; every strategy is valued at 0 until a replacement exists.
export async function getVpValueByStrategy(
  proposal: Proposal
): Promise<number[]> {
  return proposal.strategies.map(() => 0);
}
