import { gql } from '../hub.js';

type Proposal = {
  id: string;
  title: string;
  space: { id: string };
  state: string;
  end: number;
  scores_total: number;
};

export async function listProposals(opts: {
  space?: string;
  state?: string;
  first?: number;
}): Promise<void> {
  const where: Record<string, unknown> = {};
  if (opts.space !== undefined) where.space_in = [opts.space];
  if (opts.state !== undefined) where.state = opts.state;

  const { proposals } = await gql<{ proposals: Proposal[] }>(
    `query ($where: ProposalWhere, $first: Int) {
      proposals(first: $first, where: $where, orderBy: "created", orderDirection: desc) {
        id title state end scores_total space { id }
      }
    }`,
    { where, first: opts.first ?? 20 }
  );

  for (const p of proposals) {
    console.log(
      `${p.id}\t${p.state}\t${p.space.id}\t${p.title}\thttps://snapshot.box/#/s:${p.space.id}/proposal/${p.id}`
    );
  }
}
