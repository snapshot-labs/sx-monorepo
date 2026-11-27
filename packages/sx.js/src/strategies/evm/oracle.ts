import { defaultAbiCoder } from '@ethersproject/abi';
import { Contract } from '@ethersproject/contracts';
import { Provider } from '@ethersproject/providers';
import { toUtf8Bytes } from '@ethersproject/strings';
import SpaceAbi from '../../clients/evm/ethereum-tx/abis/Space.json';
import {
  ClientConfig,
  Propose,
  Strategy,
  StrategyConfig,
  Vote
} from '../../clients/evm/types';
import { VotingPowerDetailsError } from '../../utils/errors';

// Snapshot's oracle signs with score-api. A space can use another oracle by setting its URL in the
// strategy metadata payload, as JSON: { "url": "https://…" }
export const DEFAULT_ORACLE_URL = 'https://score.snapshot.org';

const NOT_FINAL_ERROR = 'voting power is not final yet';
const ORACLE_TIMEOUT = 30_000;
const ORACLE_STRATEGY_ABI = [
  'function getVotingPower(uint32 blockNumber, address voter, bytes params, bytes userParams) view returns (uint256)'
];

export type OracleStrategy = {
  id: string;
  network: string;
  decimals: number;
  params: Record<string, any>;
};

// A URL set but unusable is an error: asking another oracle would show voting power the strategy refuses
function getOracleUrl(metadata: Record<string, any> | null) {
  const url = metadata?.url ?? DEFAULT_ORACLE_URL;
  if (typeof url === 'string' && /^https?:\/\//.test(url)) return url;

  throw new VotingPowerDetailsError(
    'Invalid oracle URL',
    'oracle',
    'UNAVAILABLE'
  );
}

// A single encoding per strategy: keys sorted at every level, no whitespace, undefined dropped like
// JSON.stringify does. The oracle refuses any other encoding
export function canonicalize(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(item => (item === undefined ? 'null' : canonicalize(item))).join(',')}]`;
  }
  if (value !== null && typeof value === 'object') {
    return `{${Object.keys(value)
      .filter(key => (value as Record<string, unknown>)[key] !== undefined)
      .sort()
      .map(
        key =>
          `${JSON.stringify(key)}:${canonicalize((value as Record<string, unknown>)[key])}`
      )
      .join(',')}}`;
  }

  return JSON.stringify(value);
}

// The space strategy params: the oracle address, then the Snapshot strategy it signs voting power for
export function encodeOracleParams(oracle: string, strategy: OracleStrategy) {
  if (
    typeof strategy.id !== 'string' ||
    !strategy.id ||
    typeof strategy.network !== 'string' ||
    !Number.isInteger(strategy.decimals) ||
    strategy.decimals < 0 ||
    strategy.params === null ||
    typeof strategy.params !== 'object' ||
    Array.isArray(strategy.params)
  ) {
    throw new Error('Invalid oracle strategy');
  }

  return defaultAbiCoder.encode(
    ['address', 'bytes'],
    [oracle, toUtf8Bytes(canonicalize(strategy))]
  );
}

// The exact raw voting power at a past block, and the oracle signature over it
async function getSignedVotingPower(
  metadata: Record<string, any> | null,
  request: {
    address: string;
    network: string;
    snapshot: number;
    params: string;
    strategy: string;
  }
): Promise<{ vp: string; signature: string }> {
  const [, oracleParams] = defaultAbiCoder.decode(
    ['address', 'bytes'],
    request.params
  );

  const url = getOracleUrl(metadata);
  let body: any;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'get_signed_vp',
        params: { ...request, params: oracleParams },
        id: null
      }),
      signal: AbortSignal.timeout(ORACLE_TIMEOUT)
    });
    body = await res.json();
  } catch (err) {
    throw new VotingPowerDetailsError(
      `Oracle unreachable: ${(err as Error).message}`,
      'oracle',
      'UNAVAILABLE'
    );
  }

  if (body?.error || !body?.result) {
    const message = String(body?.error?.data ?? body?.error?.message ?? '');
    throw new VotingPowerDetailsError(
      `Oracle error: ${message}`,
      'oracle',
      message.includes(NOT_FINAL_ERROR) ? 'NOT_READY_YET' : 'UNAVAILABLE'
    );
  }

  return body.result;
}

export default function createOracleStrategy(): Strategy {
  return {
    type: 'oracle',
    async getParams(
      call: 'propose' | 'vote',
      strategyConfig: StrategyConfig,
      signerAddress: string,
      metadata: Record<string, any> | null,
      data: Propose | Vote,
      clientConfig: ClientConfig
    ): Promise<string> {
      try {
        let blockNumber: number;
        if (call === 'vote') {
          const { space, proposal } = data as Vote;
          const spaceContract = new Contract(
            space,
            SpaceAbi,
            clientConfig.provider
          );
          ({ startBlockNumber: blockNumber } =
            await spaceContract.proposals(proposal));
        } else {
          // Only validations that read voting power at a recent block (VotingPowerV2) can use an oracle
          blockNumber = (data as Propose).blockNumber ?? 0;
          if (!blockNumber) {
            throw new VotingPowerDetailsError(
              'Oracle voting power needs a past block',
              'oracle',
              'UNAVAILABLE'
            );
          }
        }

        const { vp, signature } = await getSignedVotingPower(metadata, {
          address: signerAddress,
          network: String(clientConfig.networkConfig.eip712ChainId),
          snapshot: blockNumber,
          params: strategyConfig.params,
          strategy: strategyConfig.address
        });

        return defaultAbiCoder.encode(['uint256', 'bytes'], [vp, signature]);
      } catch (err) {
        // Report every failure: any other error reads as no voting power, and drops the strategy from the vote
        if (err instanceof VotingPowerDetailsError) throw err;
        throw new VotingPowerDetailsError(
          `Oracle voting power failed: ${(err as Error).message}`,
          'oracle',
          'UNAVAILABLE'
        );
      }
    },
    // The signed value the vote would carry, as the strategy counts it, so shown and counted voting power are
    // equal, and an oracle whose signatures the strategy refuses shows an error. Without a block, the latest
    // one the oracle signs: the safe head
    async getVotingPower(
      strategyAddress: string,
      voterAddress: string,
      metadata: Record<string, any> | null,
      block: number | null,
      params: string,
      provider: Provider
    ): Promise<bigint> {
      const [{ chainId }, snapshot] = await Promise.all([
        provider.getNetwork(),
        block ?? provider.getBlock('safe').then(({ number }) => number)
      ]);
      const { vp, signature } = await getSignedVotingPower(metadata, {
        address: voterAddress,
        network: String(chainId),
        snapshot,
        params,
        strategy: strategyAddress
      });

      const votingPower = await new Contract(
        strategyAddress,
        ORACLE_STRATEGY_ABI,
        provider
      ).getVotingPower(
        snapshot,
        voterAddress,
        params,
        defaultAbiCoder.encode(['uint256', 'bytes'], [vp, signature])
      );

      return BigInt(votingPower.toString());
    }
  };
}
