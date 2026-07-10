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
  isError?: boolean;
};

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
  fn: () => Promise<unknown>
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
    return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
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
      description:
        'Returns the Snapshot GraphQL schema. Large response: call only when a snapshot-query fails on an unknown field, not preemptively. Common queries are listed in the server instructions.',
      inputSchema: {},
      annotations: { readOnlyHint: true }
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
      description:
        'Execute any GraphQL query against the Snapshot API. The user\'s address is auto-bound as $user: declare `query Foo($user: String!)` and do NOT pass `user` in `variables` (it is overwritten). Common queries: `spaces(where: { search })` to find a space by name (ids are slugs like "ens.eth", not names); `proposals(where: { space_in, state })`; `proposals(where: { title_contains })`; `vp(voter: $user, space, proposal)` for voting power; `user(id: $user) { name about }` for the user\'s profile. Timestamps are unix seconds UTC. Use snapshot-schema only when this query errors on an unknown field.',
      inputSchema: {
        query: z.string().describe('GraphQL query string'),
        variables: z
          .record(z.string(), z.unknown())
          .optional()
          .describe('GraphQL variables')
      },
      annotations: { readOnlyHint: true }
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
      description:
        'Return the connected identity and signing capability. `address` is the user\'s account, auto-injected as `$user` in snapshot-query. `alias` is the delegated signer wallet that actually signs writes on the user\'s behalf. `authorized` is true only when that alias is currently authorized for the user: when false, write tools (snapshot-vote, snapshot-propose, snapshot-follow) will fail until the user re-authorizes. `links.alias` points to the page where the user authorizes or revokes that alias. Call this to confirm whose behalf the assistant is acting on, and as a pre-flight before writes. Also returns the user\'s public profile (name, about, avatar) when one exists. If no wallet is connected, returns the authorization prompt.',
      inputSchema: {},
      annotations: { readOnlyHint: true }
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
            .then(r => (r as { user: unknown }).user)
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
      })
  );
}

export function registerVoteTool(
  server: McpServer,
  resolveContext: ResolveContext
): void {
  server.registerTool(
    'snapshot-vote',
    {
      description:
        'Cast a vote on a Snapshot proposal. Re-calling this on the same proposal REPLACES the previous vote (use it to change a vote). The proposal\'s `type` and `privacy` are fetched and applied automatically; shutter-encrypted proposals strip the reason. Preconditions: proposal `state: "active"` and `vp(voter: $user, space, proposal).vp > 0`. If not yet authorized, returns the authorization URL.',
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
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true }
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
      })
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
      description:
        'Create a Snapshot proposal. Only `space`, `title`, `body` are required. The space\'s enforced voting type, voting period, and privacy mode are read from the space and applied automatically; the snapshot block is set to the current chain head of the space\'s network. `choices` defaults to ["For", "Against", "Abstain"] for basic voting and is required for other types. Pass `privacy: "shutter"` only on spaces where `voting.privacy === "any"` to opt into Shutter encryption; spaces with `voting.privacy === "shutter"` always encrypt.',
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
      annotations: { readOnlyHint: false, destructiveHint: false }
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
      })
  );
}

export function registerFollowTool(
  server: McpServer,
  resolveContext: ResolveContext
): void {
  server.registerTool(
    'snapshot-follow',
    {
      description:
        'Follow or unfollow a Snapshot space for the user. Set `action: "follow"` (default) to add the space to the followed list, or `action: "unfollow"` to remove it. Following a space you already follow returns the error "you are already following this space", and unfollowing a space you do not follow returns "you can only unfollow a space you follow". Check the current state first via `follows(where: { follower: $user })`, which also lists followed spaces.',
      inputSchema: {
        space: z.string().describe('Space ID slug (e.g. "ens.eth")'),
        action: z
          .enum(['follow', 'unfollow'])
          .default('follow')
          .describe('Whether to follow or unfollow the space. Defaults to "follow".')
      },
      annotations: { readOnlyHint: false, destructiveHint: true }
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
      })
  );
}
