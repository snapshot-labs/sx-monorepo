import { clients, offchainMainnet } from '@snapshot-labs/sx';
import { getAddress } from 'viem';
import { getCdpSigner } from './cdp';
import { getActiveAgents, incrementVoteCount } from './db';

const HUB_URL = 'https://hub.snapshot.org/graphql';
const DEFAULT_PROPOSAL_ID =
  '0x74aac72426dfe5326da2af06b71849809d0d52c88999d4ed681a386bcbaf6e78';

const client = new clients.OffchainEthereumSig({
  networkConfig: offchainMainnet
});

type Proposal = {
  id: string;
  choices: string[];
  state: string;
  space: { id: string };
};

type VoteResult = { user: string; status: 'voted' | 'error'; error?: string };

async function fetchProposal(proposalId: string): Promise<Proposal | null> {
  const res = await fetch(HUB_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `query { proposal(id: "${proposalId}") { id choices state space { id } } }`
    })
  });
  const json = (await res.json()) as any;
  return json.data?.proposal ?? null;
}

export async function triggerVote(proposalId = DEFAULT_PROPOSAL_ID) {
  const proposal = await fetchProposal(proposalId);
  if (!proposal) throw new Error(`Proposal ${proposalId} not found`);
  if (proposal.state !== 'active')
    throw new Error(`Proposal is not active (state: ${proposal.state})`);

  const agents = await getActiveAgents();
  const eligible = agents.filter(a =>
    a.contexts.some(c => c.space_id === proposal.space.id)
  );
  const results: VoteResult[] = [];

  for (const agent of eligible) {
    try {
      const signer = getCdpSigner(agent.agent_name, agent.agent_address);
      const envelope = await client.vote({
        signer,
        data: {
          space: proposal.space.id,
          proposal: proposal.id,
          type: 'basic',
          choice: 2,
          privacy: 'none',
          authenticator: '',
          strategies: [],
          metadataUri: '',
          app: 'snapshot-agent',
          reason: 'Voted by AI agent',
          from: getAddress(agent.user_address)
        }
      });
      await client.send(envelope);
      await incrementVoteCount(agent.id);
      console.log('Agent voted', {
        space: proposal.space.id,
        user: agent.user_address
      });
      results.push({ user: agent.user_address, status: 'voted' });
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      console.error('Failed to vote', { user: agent.user_address, error });
      results.push({ user: agent.user_address, status: 'error', error });
    }
  }

  const voted = results.filter(r => r.status === 'voted').length;
  return { voted, skipped: results.length - voted, results };
}
