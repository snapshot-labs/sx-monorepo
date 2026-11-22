// Stub `window` so SX's `if (window)` shutter guard is falsy in Node. We init shutter ourselves.
(globalThis as { window?: unknown }).window ??= undefined;

import { Wallet } from '@ethersproject/wallet';
import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { init as shutterInit } from '@shutter-network/shutter-crypto';
import { clients, offchainMainnet } from '@snapshot-labs/sx';
import { z } from 'zod';
import { type CdpSigner, getWalletForUser } from './cdp.js';
import logger from './logger.js';
import {
  getProposalSnapshotBlock,
  gql,
  resolveUserFromAlias,
  schemaCache
} from './hub.js';

const sx = new clients.OffchainEthereumSig({ networkConfig: offchainMainnet });

let shutterReady: Promise<void> | undefined;
const ensureShutterReady = (): Promise<void> => (shutterReady ??= shutterInit());

export type ResolveContext = (
  extra?: Record<string, unknown>
) => Promise<{ user: string; signer: Wallet | CdpSigner }>;

type AuthInfoExtra = { extra?: { user?: string; signerKey?: string } };

export function createResolveContext(mode: 'http' | 'stdio'): ResolveContext {
  return async extra => {
    const { user, signerKey } =
      (extra?.authInfo as AuthInfoExtra | undefined)?.extra ?? {};

    if (user !== undefined && signerKey !== undefined) {
      return { user, signer: await getWalletForUser(signerKey) };
    }
    if (mode === 'http') {
      throw new Error(
        'Not authenticated. Click Connect in your MCP client to authorize with Snapshot.'
      );
    }
    const privateKey = process.env.ALIAS_PRIVATE_KEY;
    if (privateKey === undefined) {
      throw new Error(
        'ALIAS_PRIVATE_KEY is required for stdio mode. Set it in .env.'
      );
    }
    const signer = new Wallet(privateKey);
    const alias = await signer.getAddress();
    const resolved = await resolveUserFromAlias(alias);
    if (resolved === undefined) {
      throw new Error(
        `Not authorized. Visit https://snapshot.box/#/settings/alias/authorize/${alias} to authorize, then retry.`
      );
    }
    return { user: resolved, signer };
  };
}

type ToolResponse = {
  content: { type: 'text'; text: string }[];
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
};

// Every tool only talks to Snapshot, so none of them reach an open world.
const READ = { readOnlyHint: true, openWorldHint: false };

const LINK = z.url();

type Extra = { requestId?: unknown; sessionId?: unknown; authInfo?: AuthInfoExtra };

type SpaceInfo = {
  id: string;
  network: string;
  voting: {
    delay: number | null;
    period: number | null;
    type: string | null;
    privacy: string | null;
  };
};

async function requireSpace<T>(id: string, fields: string): Promise<T> {
  const { space } = (await gql(
    `query ($id: String!) { space(id: $id) { ${fields} } }`,
    { id }
  )) as { space: T | null };
  if (space === null) throw new Error(`Space not found: ${id}`);
  return space;
}

async function handle(
  tool: string,
  extra: Record<string, unknown> | undefined,
  fn: () => Promise<unknown>,
  structured = false
): Promise<ToolResponse> {
  const ex = extra as Extra | undefined;
  const reqId = String(ex?.requestId ?? '-');
  const sid = String(ex?.sessionId ?? '-').slice(0, 8);
  const u = ex?.authInfo?.extra?.user;
  const user = u !== undefined && u.length >= 10 ? `${u.slice(0, 6)}...${u.slice(-4)}` : u ?? 'anonymous';
  const log = logger.child({ reqId, sessionId: sid, tool, user });
  log.info('tool start');
  try {
    const result = await fn();
    log.info('tool ok');
    const content = [{ type: 'text' as const, text: JSON.stringify(result) }];
    return structured
      ? { content, structuredContent: result as Record<string, unknown> }
      : { content };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    log.error({ err: e }, 'tool error');
    return {
      content: [{ type: 'text' as const, text: `Error [req=${reqId}]: ${message}` }],
      isError: true
    };
  }
}

export function registerSchemaTool(server: McpServer): void {
  server.registerTool(
    'snapshot-schema',
    {
      title: 'Get the GraphQL schema',
      description:
        'Returns the full Snapshot GraphQL schema. The response is large.',
      inputSchema: {},
      annotations: { title: 'Get the GraphQL schema', ...READ }
    },
    (_args, extra) => handle('snapshot-schema', extra, () => schemaCache)
  );
}

export function registerQueryTool(
  server: McpServer,
  resolveContext: ResolveContext
): void {
  server.registerTool(
    'snapshot-query',
    {
      title: 'Query Snapshot data',
      description:
        'Runs a GraphQL query against the Snapshot Hub GraphQL API (docs: https://docs.snapshot.box/tools/api). The connected user\'s address is bound to the `$user` variable (declared as `$user: String!`), and any `user` passed in `variables` is overwritten. Useful fields: `spaces(where: { search })` finds spaces by name (ids are slugs like "ens.eth", not names); `proposals(where: { space_in, state })` and `proposals(where: { title_contains })` list proposals; `vp(voter: $user, space, proposal)` returns voting power; `user(id: $user) { name about }` returns the user\'s profile. Timestamps are unix seconds UTC.',
      inputSchema: {
        query: z.string().describe('GraphQL query string'),
        variables: z
          .record(z.string(), z.unknown())
          .optional()
          .describe('GraphQL variables')
      },
      annotations: { title: 'Query Snapshot data', ...READ }
    },
    ({ query, variables }, extra) =>
      handle('snapshot-query', extra, async () => {
        let user: string | undefined;
        try {
          ({ user } = await resolveContext(extra));
        } catch {
          // Anonymous read-only queries are still allowed.
        }
        return gql(query, user ? { ...variables, user } : variables);
      })
  );
}

export function registerWhoamiTool(
  server: McpServer,
  resolveContext: ResolveContext
): void {
  server.registerTool(
    'snapshot-whoami',
    {
      title: 'Get the connected account',
      description:
        'Returns the connected identity and signing capability: `address` (the user\'s account, bound as `$user` in queries), `alias` (the signer wallet that signs votes, proposals and follows on the user\'s behalf), `authorized` (true when that alias is currently authorized for the user; when false, votes, proposals and follows fail until the user authorizes it again), `links.alias` (the page where the user authorizes or revokes the alias) and the user\'s public profile (name, about, avatar) when one exists. Without a connected wallet, returns the authorization prompt.',
      inputSchema: {},
      outputSchema: {
        address: z.string(),
        alias: z.string(),
        authorized: z.boolean(),
        profile: z.record(z.string(), z.unknown()).nullable(),
        links: z.object({ profile: LINK, alias: LINK })
      },
      annotations: { title: 'Get the connected account', ...READ }
    },
    (_args, extra) =>
      handle('snapshot-whoami', extra, async () => {
        const { user: address, signer } = await resolveContext(extra);
        const alias = await signer.getAddress();
        const [authorized, profile] = await Promise.all([
          resolveUserFromAlias(alias)
            .then(u => u?.toLowerCase() === address.toLowerCase())
            .catch(() => false),
          gql('query ($id: String!) { user(id: $id) { name about avatar } }', {
            id: address
          })
            .then(r => (r as { user?: unknown }).user ?? null)
            // Profile lookup is best-effort; the address alone is still useful.
            .catch(() => null)
        ]);
        return {
          address,
          alias,
          authorized,
          profile,
          links: {
            profile: `https://snapshot.box/#/profile/${address}`,
            alias: `https://snapshot.box/#/settings/alias/authorize/${alias}`
          }
        };
      }, true)
  );
}

export function registerVoteTool(
  server: McpServer,
  resolveContext: ResolveContext
): void {
  server.registerTool(
    'snapshot-vote',
    {
      title: 'Vote on a proposal',
      description:
        'Casts a vote on a Snapshot proposal. Voting again on the same proposal replaces the previous vote. The proposal\'s `type` and `privacy` are fetched and applied automatically; on Shutter-encrypted proposals the reason is dropped. The proposal must be active (`state: "active"`) and the user must have voting power (`vp(voter: $user, space, proposal).vp > 0`). Returns the authorization URL when the alias is not authorized yet.',
      inputSchema: {
        space: z.string().describe('Space ID (e.g. "ens.eth")'),
        proposal: z.string().describe('Proposal ID (hex string)'),
        choice: z
          .union([z.number(), z.array(z.number()), z.record(z.string(), z.number())])
          .describe(
            'Vote choice. Number for single-choice/basic, array for approval/ranked-choice, object for weighted/quadratic'
          ),
        reason: z
          .string()
          .default('')
          .describe(
            'Reason for the vote (ignored on shutter-encrypted proposals)'
          )
      },
      outputSchema: {
        result: z.unknown(),
        links: z.object({ voter: LINK, space: LINK, proposal: LINK })
      },
      annotations: { title: 'Vote on a proposal', readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false }
    },
    (data, extra) =>
      handle('snapshot-vote', extra, async () => {
        const { user: from, signer } = await resolveContext(extra);
        const { proposal } = (await gql(
          'query ($id: String!) { proposal(id: $id) { type privacy } }',
          { id: data.proposal }
        )) as { proposal: { type: string; privacy: string } | null };
        if (!proposal) throw new Error(`Proposal not found: ${data.proposal}`);
        const privacy = proposal.privacy === 'shutter' ? 'shutter' : 'none';
        if (privacy === 'shutter') await ensureShutterReady();
        const envelope = await sx.vote({
          signer: signer as Wallet,
          data: {
            ...data,
            from,
            type: proposal.type,
            privacy,
            reason: privacy === 'shutter' ? '' : data.reason,
            app: 'snapshot-mcp',
            authenticator: '',
            strategies: [],
            metadataUri: ''
          }
        });
        const result = (await sx.send(envelope)) as { id?: string };
        return {
          result,
          links: {
            voter: `https://snapshot.box/#/profile/${from}`,
            space: `https://snapshot.box/#/s:${data.space}`,
            proposal: `https://snapshot.box/#/s:${data.space}/proposal/${data.proposal}`
          }
        };
      }, true)
  );
}

const VOTE_TYPES = [
  'basic',
  'single-choice',
  'approval',
  'ranked-choice',
  'weighted',
  'quadratic'
] as const;

const DEFAULT_VOTING_PERIOD = 60 * 60 * 24 * 3;

export function registerProposeTool(
  server: McpServer,
  resolveContext: ResolveContext
): void {
  server.registerTool(
    'snapshot-propose',
    {
      title: 'Create a proposal',
      description:
        'Creates a Snapshot proposal. Only `space`, `title` and `body` are required. The space\'s enforced voting type, voting period and privacy mode are read from the space and applied automatically, and the snapshot block is set to the current chain head of the space\'s network. `choices` defaults to ["For", "Against", "Abstain"] for basic voting and is required for other types. `privacy: "shutter"` is honored only on spaces where `voting.privacy` is "any"; spaces where it is "shutter" always encrypt.',
      inputSchema: {
        space: z.string().describe('Space ID slug (e.g. "ens.eth")'),
        title: z.string().min(1).describe('Proposal title'),
        body: z.string().default('').describe('Proposal body (markdown)'),
        discussion: z.string().default('').describe('Discussion link (optional)'),
        type: z.enum(VOTE_TYPES).optional().describe('Voting type. Defaults to the space\'s enforced type, or "basic" if the space allows any.'),
        choices: z.array(z.string().min(1)).optional().describe('Vote choices. Defaults to ["For","Against","Abstain"] for "basic". Required for other types.'),
        labels: z.array(z.string()).default([]).describe('Proposal label IDs (optional)'),
        start: z.number().int().optional().describe('Voting start (unix seconds). Defaults to now + space.voting.delay.'),
        end: z.number().int().optional().describe('Voting end (unix seconds). Defaults to start + space.voting.period (3 days if unset).'),
        privacy: z.enum(['shutter', 'none']).optional().describe('Shutter shielded voting. Only honored when the space\'s voting.privacy is "any" (or already "shutter", in which case it is forced).')
      },
      outputSchema: {
        result: z.unknown(),
        links: z.object({ space: LINK, proposal: LINK.optional() })
      },
      annotations: { title: 'Create a proposal', readOnlyHint: false, destructiveHint: false, openWorldHint: false }
    },
    (data, extra) =>
      handle('snapshot-propose', extra, async () => {
        const { user: from, signer } = await resolveContext(extra);
        const space = await requireSpace<SpaceInfo>(
          data.space,
          'id network voting { delay period type privacy }'
        );

        const enforcedType = space.voting.type;
        if (enforcedType && data.type && data.type !== enforcedType) {
          throw new Error(`Space "${space.id}" enforces voting type "${enforcedType}"`);
        }
        const type = data.type ?? enforcedType ?? 'basic';

        const choices = data.choices ?? (type === 'basic' ? ['For', 'Against', 'Abstain'] : []);
        if (choices.length < 2) {
          throw new Error(`\`choices\` is required for voting type "${type}" (need at least 2)`);
        }

        const spacePrivacy = space.voting.privacy ?? '';
        const wantsShutter = data.privacy === 'shutter';
        if (wantsShutter && spacePrivacy !== 'any' && spacePrivacy !== 'shutter') {
          throw new Error(`Space "${space.id}" does not allow shielded voting (voting.privacy = "${spacePrivacy || 'none'}")`);
        }
        const privacy = spacePrivacy === 'shutter' || wantsShutter ? 'shutter' : '';

        const now = Math.floor(Date.now() / 1000);
        const start = data.start ?? now + (space.voting.delay ?? 0);
        const period = space.voting.period ?? DEFAULT_VOTING_PERIOD;
        const end = data.end ?? start + (period > 0 ? period : DEFAULT_VOTING_PERIOD);
        if (end <= start) throw new Error('`end` must be greater than `start`');

        const chainId = Number(space.network);
        if (!Number.isFinite(chainId)) {
          throw new Error(`Space "${space.id}" has unsupported network "${space.network}"`);
        }

        const envelope = await sx.propose({
          signer: signer as Wallet,
          data: {
            space: space.id, type, title: data.title, body: data.body,
            discussion: data.discussion, choices, privacy, labels: data.labels,
            start, end, snapshot: await getProposalSnapshotBlock(chainId),
            plugins: '{}', app: 'snapshot-mcp', from
          } as Parameters<typeof sx.propose>[0]['data']
        });
        const result = (await sx.send(envelope)) as { id?: string };
        return {
          result,
          links: {
            space: `https://snapshot.box/#/s:${space.id}`,
            proposal: result.id ? `https://snapshot.box/#/s:${space.id}/proposal/${result.id}` : undefined
          }
        };
      }, true)
  );
}

export function registerFollowTool(
  server: McpServer,
  resolveContext: ResolveContext
): void {
  server.registerTool(
    'snapshot-follow',
    {
      title: 'Follow or unfollow a space',
      description:
        'Follows or unfollows a Snapshot space for the user. `action` is "follow" by default, or "unfollow". Following a space already followed returns the error "you are already following this space", and unfollowing a space not followed returns "you can only unfollow a space you follow". The `follows(where: { follower: $user })` query lists the user\'s followed spaces.',
      inputSchema: {
        space: z.string().describe('Space ID slug (e.g. "ens.eth")'),
        action: z
          .enum(['follow', 'unfollow'])
          .default('follow')
          .describe('Whether to follow or unfollow the space. Defaults to "follow".')
      },
      outputSchema: {
        action: z.enum(['follow', 'unfollow']),
        result: z.unknown(),
        links: z.object({ space: LINK })
      },
      annotations: { title: 'Follow or unfollow a space', readOnlyHint: false, destructiveHint: true, openWorldHint: false }
    },
    (data, extra) =>
      handle('snapshot-follow', extra, async () => {
        const { user: from, signer } = await resolveContext(extra);
        const space = await requireSpace<{ id: string }>(data.space, 'id');
        const payload = {
          signer: signer as Wallet,
          data: { from, space: space.id, network: 's' }
        };
        const envelope =
          data.action === 'unfollow'
            ? await sx.unfollowSpace(payload)
            : await sx.followSpace(payload);
        const result = (await sx.send(envelope)) as unknown;
        return {
          action: data.action,
          result,
          links: { space: `https://snapshot.box/#/s:${space.id}` }
        };
      }, true)
  );
}

export function registerPrompts(server: McpServer): void {
  server.registerPrompt(
    'space-summary',
    {
      title: 'Summarize a space',
      description: 'Active and recent proposals of a Snapshot space, with their results.',
      argsSchema: { space: z.string().describe('Space ID (e.g. "ens.eth")') }
    },
    ({ space }) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Summarize the Snapshot space ${JSON.stringify(space)}: its active proposals and the five most recent closed ones, what each decides, the current or final results, and when voting ends.`
          }
        }
      ]
    })
  );
  server.registerPrompt(
    'proposals-to-vote',
    {
      title: 'Proposals I can vote on',
      description: 'Active proposals in the spaces you follow, with your voting power.'
    },
    () => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: 'List the active Snapshot proposals in the spaces I follow, with my voting power on each and whether I already voted.'
          }
        }
      ]
    })
  );
}
