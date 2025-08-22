import { Contract } from '@ethersproject/contracts';
import * as db from '../db';
import { sleep } from '../utils';
import { createWalletProxy } from './dependencies';
import logger from './logger';

const APE_GAS_CHAIN_IDS = [
  33139
  // Curtis is disabled as Herodotus API is currently mainnet-only
  // 33111
];
const MULTICALL3_ADDRESS = '0xcA11bde05977b3631167028862bE2a173976CA11';
const HERODOTUS_API_URL = 'https://apevote.api.herodotus.cloud/votes';
const INTERVAL = 15_000;

async function processApeGasProposal(
  proposal: db.ApeGasProposal & { id: string }
) {
  const response = await fetch(HERODOTUS_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      view_id: proposal.viewId,
      block_number: proposal.snapshot
    })
  });

  if (!response.ok) {
    throw new Error('Failed to process ape gas proposal');
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(`Herodotus API error: ${data.error}`);
  }

  await db.updateApeGasProposal(proposal.id, {
    processed: true,
    herodotusId: data.id
  });
}

export async function processApeGasProposals(chainId: number) {
  const { provider } = createWalletProxy(chainId);

  const multicallContract = new Contract(
    MULTICALL3_ADDRESS,
    ['function getBlockNumber() view returns (uint256 blockNumber)'],
    provider
  );

  const currentL1BlockNumber = (
    await multicallContract.getBlockNumber()
  ).toNumber();

  logger.info(
    { chainId, currentL1BlockNumber },
    'Processing ape gas proposals'
  );

  const proposals = await db.getApeGasProposalsToProcess({
    chainId,
    maxSnapshot: currentL1BlockNumber
  });

  for (const proposal of proposals) {
    try {
      await processApeGasProposal(proposal);
    } catch (err) {
      logger.error({ err, proposal }, 'Failed to process ape gas proposal');
    }
  }
}

export async function registeredApeGasProposalsLoop() {
  while (true) {
    for (const chainId of APE_GAS_CHAIN_IDS) {
      try {
        await processApeGasProposals(chainId);
      } catch (err) {
        logger.error({ err, chainId }, 'Failed to process ape gas proposals');
      }
    }

    await sleep(INTERVAL);
  }
}
