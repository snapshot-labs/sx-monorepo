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

/** Validators per multicall request. */
const BATCH_SIZE = 50;

/** Multicall contract (`aggregate`), same address on mainnet and Sepolia. */
const MULTICALL =
  '0x05754af3760f3356da99aea5c3ec39ccac7783d925a19666ebbeca58ff0087f4';

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

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
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

  /**
   * Many view calls on the staking contract in one `aggregate` request (the
   * public node drops connections under hundreds of separate calls).
   */
  const multicall = async (
    entrypoint: string,
    stakerAddresses: string[]
  ): Promise<any[]> => {
    const callArray: string[] = [];
    const calldata: string[] = [];
    for (const stakerAddress of stakerAddresses) {
      const args = callData
        .compile(entrypoint, { staker_address: stakerAddress })
        .map(String);
      callArray.push(
        config.staking,
        hash.getSelectorFromName(entrypoint),
        String(calldata.length),
        String(args.length)
      );
      calldata.push(...args);
    }
    const result = await withRetry(() =>
      provider.callContract(
        {
          contractAddress: MULTICALL,
          entrypoint: 'aggregate',
          calldata: [
            String(stakerAddresses.length),
            ...callArray,
            String(calldata.length),
            ...calldata
          ]
        },
        block
      )
    );
    // [block_number, retdata_len, (len, ...retdata) per call]
    const parsed: any[] = [];
    let i = 2;
    for (let call = 0; call < stakerAddresses.length; call++) {
      const len = Number(BigInt(result[i]));
      parsed.push(callData.parse(entrypoint, result.slice(i + 1, i + 1 + len)));
      i += 1 + len;
    }
    return parsed;
  };

  const unwrap = (option: any) => option?.Some ?? option?.unwrap?.();

  // 1) get_staker_info_v1 returns an Option and never reverts: safe to batch.
  const stakerList = [...stakers];
  const infos = new Map<string, any>();
  const infoBatches = chunk(stakerList, BATCH_SIZE);
  for (const [n, batch] of infoBatches.entries()) {
    const results = await multicall('get_staker_info_v1', batch);
    batch.forEach((staker, i) => infos.set(staker, unwrap(results[i])));
    process.stdout.write(`\rstaker info: ${n + 1}/${infoBatches.length}`);
  }
  process.stdout.write('\n');

  // 2) staker_pool_info reverts for exited stakers, so only ask existing ones.
  const existing = stakerList.filter(staker => infos.get(staker));
  const poolInfos = new Map<string, any>();
  for (const batch of chunk(existing, BATCH_SIZE)) {
    const results = await multicall('staker_pool_info', batch);
    batch.forEach((staker, i) => poolInfos.set(staker, results[i]));
  }

  const rows = existing.map(staker => {
    const info = infos.get(staker);
    const poolInfo = poolInfos.get(staker);
    const strkPool = (poolInfo.pools as any[]).find(
      pool => normalize(pool.token_address) === normalize(STRK_TOKEN)
    );
    if (!strkPool) return null;
    const commission = unwrap(poolInfo.commission);
    return {
      staker,
      pool: normalize(strkPool.pool_contract),
      delegated: BigInt(strkPool.amount).toString(),
      own: BigInt(info.amount_own).toString(),
      commission: commission !== undefined ? Number(commission) : null,
      exiting: Boolean(unwrap(info.unstake_time))
    };
  });

  const liveness = await loadLiveness(provider, config.staking, block);

  // Sorted by total stake (self-stake + delegated), i.e. staking power.
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
