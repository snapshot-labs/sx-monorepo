/**
 * Builds the list of validators and their STRK delegation pools used by the
 * staked vote delegation page (SNIP: Staked STRK Vote Delegation to Validators).
 *
 * The staking contract has no getter that lists validators, so we read its
 * `NewDelegationPool` events once, then query `staker_pool_info` and
 * `get_staker_info_v1` for every validator found.
 *
 * Usage:
 *   node --experimental-strip-types scripts/generate-staking-pools.ts <sn|sn-sep> <rpcUrl>
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CallData, hash, num, RpcProvider } from 'starknet';

type NetworkId = 'sn' | 'sn-sep';

const STRK_TOKEN =
  '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d';

const NETWORKS: Record<NetworkId, { staking: string; fromBlock: number }> = {
  sn: {
    staking:
      '0x00ca1702e64c81d9a07b86bd2c540188d92a2c73cf5cc0e508d949015e7e84a7',
    fromBlock: 0
  },
  'sn-sep': {
    staking:
      '0x03745ab04a431fc02871a139be6b93d9260b0ff3e779ad9c8b377183b23109f1',
    fromBlock: 0
  }
};

const CONCURRENCY = 4;

/** Uptime window, as on the Voyager staking dashboard. */
const LIVENESS_DAYS = 30;

/** Retries flaky RPC calls (public nodes drop requests under load). */
async function withRetry<T>(fn: () => Promise<T>, attempts = 8): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt >= attempts) throw err;
      await new Promise(resolve => setTimeout(resolve, 1000 * 2 ** attempt));
    }
  }
}

function normalize(address: string | bigint) {
  return num.toHex64(num.toBigInt(address));
}

async function mapWithConcurrency<T, U>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<U>
): Promise<U[]> {
  const results: U[] = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: limit }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await fn(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
}

/**
 * Share of recent epochs each validator attested in, from the attestation
 * contract's `StakerAttestationSuccessful` events over the last
 * LIVENESS_DAYS. The denominator is the number of epochs seen in the window.
 */
async function loadLiveness(
  provider: RpcProvider,
  staking: string,
  latestBlock: number
): Promise<{ byStaker: Map<string, number>; epochs: number }> {
  const { abi } = await provider.getClassAt(staking);
  const callData = new CallData(abi);
  const params = callData.parse(
    'contract_parameters_v1',
    await provider.callContract({
      contractAddress: staking,
      entrypoint: 'contract_parameters_v1'
    })
  ) as { attestation_contract: bigint };
  const attestation = normalize(params.attestation_contract);

  // Estimate the first block of the window from recent block times.
  const sampleSpan = 10_000;
  const [latest, earlier] = await Promise.all([
    provider.getBlockWithTxHashes(latestBlock),
    provider.getBlockWithTxHashes(latestBlock - sampleSpan)
  ]);
  const secondsPerBlock =
    (Number(latest.timestamp) - Number(earlier.timestamp)) / sampleSpan;
  const windowBlocks = Math.ceil((LIVENESS_DAYS * 86_400) / secondsPerBlock);
  const fromBlock = Math.max(0, latestBlock - windowBlocks);

  const key = hash.getSelectorFromName('StakerAttestationSuccessful');
  const attested = new Map<string, Set<string>>();
  const epochs = new Set<string>();
  let continuationToken: string | undefined;
  let pages = 0;
  do {
    const page = await withRetry(() =>
      provider.getEvents({
        address: attestation,
        keys: [[key]],
        from_block: { block_number: fromBlock },
        to_block: { block_number: latestBlock },
        chunk_size: 1000,
        continuation_token: continuationToken
      })
    );
    for (const event of page.events) {
      const staker = normalize(event.keys[1]);
      const epoch = event.data[0];
      epochs.add(epoch);
      if (!attested.has(staker)) attested.set(staker, new Set());
      attested.get(staker)!.add(epoch);
    }
    continuationToken = page.continuation_token;
    process.stdout.write(`\rattestation pages: ${++pages}`);
  } while (continuationToken);
  process.stdout.write('\n');

  const byStaker = new Map<string, number>();
  for (const [staker, set] of attested) {
    byStaker.set(staker, epochs.size ? set.size / epochs.size : 0);
  }
  return { byStaker, epochs: epochs.size };
}

async function main() {
  const [networkId, rpcUrl] = process.argv.slice(2) as [NetworkId, string];
  const config = NETWORKS[networkId];
  if (!config || !rpcUrl) {
    console.error(
      'Usage: generate-staking-pools.ts <sn|sn-sep> <rpcUrl>\n(the RPC URL is not written to the output)'
    );
    process.exit(1);
  }

  const provider = new RpcProvider({
    nodeUrl: rpcUrl,
    blockIdentifier: 'latest'
  });
  const block = await provider.getBlockNumber();

  const stakers = new Set<string>();
  const eventKey = hash.getSelectorFromName('NewDelegationPool');
  let continuationToken: string | undefined;
  do {
    const page = await withRetry(() =>
      provider.getEvents({
        address: config.staking,
        keys: [[eventKey]],
        from_block: { block_number: config.fromBlock },
        to_block: { block_number: block },
        chunk_size: 1000,
        continuation_token: continuationToken
      })
    );
    for (const event of page.events) stakers.add(normalize(event.keys[1]));
    continuationToken = page.continuation_token;
    process.stdout.write(`\rvalidators found: ${stakers.size}`);
  } while (continuationToken);
  process.stdout.write('\n');

  const { abi } = await provider.getClassAt(config.staking);
  const callData = new CallData(abi);

  const callView = async (entrypoint: string, stakerAddress: string) => {
    const result = await withRetry(() =>
      provider.callContract(
        {
          contractAddress: config.staking,
          entrypoint,
          calldata: callData.compile(entrypoint, {
            staker_address: stakerAddress
          })
        },
        block
      )
    );
    return callData.parse(entrypoint, result) as any;
  };

  const failures: string[] = [];
  const rows = await mapWithConcurrency(
    [...stakers],
    CONCURRENCY,
    async staker => {
      try {
        const [stakerInfo, poolInfo] = await Promise.all([
          callView('get_staker_info_v1', staker),
          callView('staker_pool_info', staker)
        ]);
        const info = stakerInfo?.Some ?? stakerInfo?.unwrap?.();
        if (!info) return null;
        const exiting = Boolean(
          info.unstake_time?.Some ?? info.unstake_time?.unwrap?.()
        );
        const strkPool = (poolInfo.pools as any[]).find(
          pool => normalize(pool.token_address) === normalize(STRK_TOKEN)
        );
        if (!strkPool) return null;
        const commission =
          poolInfo.commission?.Some ?? poolInfo.commission?.unwrap?.();
        return {
          staker,
          pool: normalize(strkPool.pool_contract),
          delegated: BigInt(strkPool.amount).toString(),
          own: BigInt(info.amount_own).toString(),
          commission: commission !== undefined ? Number(commission) : null,
          exiting
        };
      } catch (err) {
        const message = (err as Error).message;
        // "Staker does not exist" (some RPCs return it hex-encoded)
        const isExited =
          message.includes('Staker does not exist') ||
          message.includes('5374616b657220646f6573206e6f74206578697374');
        if (!isExited) {
          console.warn(`\nfailed ${staker}: ${message.split('\n')[0]}`);
          failures.push(staker);
        }
        return null;
      }
    }
  );

  if (failures.length) {
    // Never write a partial list: missing validators would silently drop
    // their delegators' pools from the page.
    console.error(
      `\n${failures.length} validators could not be read; not writing the file. Re-run, ideally with a less loaded RPC.`
    );
    process.exit(1);
  }

  const liveness = await loadLiveness(provider, config.staking, block);

  // Sorted by total stake (self-stake + delegated): what a validator votes with.
  const total = (row: { own: string; delegated: string }) =>
    BigInt(row.own) + BigInt(row.delegated);
  const validators = rows
    .filter((row): row is NonNullable<typeof row> => row !== null)
    .map(row => ({
      ...row,
      liveness: liveness.byStaker.get(row.staker) ?? 0
    }))
    .sort((a, b) => (total(b) > total(a) ? 1 : -1));

  const output = {
    network: networkId,
    block,
    generatedAt: new Date().toISOString(),
    staking: config.staking,
    token: STRK_TOKEN,
    liveness: {
      days: LIVENESS_DAYS,
      epochs: liveness.epochs
    },
    validators
  };

  const outFile = join(
    dirname(fileURLToPath(import.meta.url)),
    `../src/helpers/stakedVoteDelegation/pools.${networkId}.json`
  );
  writeFileSync(outFile, `${JSON.stringify(output, null, 2)}\n`);
  console.log(`wrote ${validators.length} validators to ${outFile}`);
}

main();
