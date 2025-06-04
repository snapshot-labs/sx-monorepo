import * as db from '../db';
import { sleep } from '../utils';

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

export async function registeredApeGasProposalsLoop() {
  while (true) {
    const proposals = await db.getApeGasProposalsToProcess();

    console.log('processing', proposals.length, 'ape gas proposals');

    for (const proposal of proposals) {
      try {
        await processApeGasProposal(proposal);
      } catch (e) {
        console.log('error', e);
      }
    }

    await sleep(INTERVAL);
  }
}
