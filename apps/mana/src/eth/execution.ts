import { clients } from '@snapshot-labs/sx';
import { wallet } from './dependencies';

type Cache = {
  [key: string]: any;
};

const CACHED_RECEIPTS: Cache = {};

const client = new clients.EvmEthereumTx();

export async function execute(space: string, proposalId: number, executionParams: string) {
  const cacheKey = `execute-${space}-${proposalId}-${executionParams}`;
  if (CACHED_RECEIPTS[cacheKey]) {
    return CACHED_RECEIPTS[cacheKey];
  }

  const receipt = await client.execute({
    signer: wallet,
    space,
    proposal: proposalId,
    executionParams
  });

  CACHED_RECEIPTS[cacheKey] = receipt;

  return receipt;
}

export async function executeQueuedProposal(executionStrategy: string, executionParams: string) {
  const cacheKey = `executeQueuedProposal-${executionStrategy}-${executionParams}`;
  if (CACHED_RECEIPTS[cacheKey]) {
    return CACHED_RECEIPTS[cacheKey];
  }

  const receipt = await client.executeQueuedProposal({
    signer: wallet,
    executionStrategy,
    executionParams
  });

  CACHED_RECEIPTS[cacheKey] = receipt;

  return receipt;
}
