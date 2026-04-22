import { encodeAbiParameters, keccak256, toHex } from 'viem';

const ZERO_BYTES32: `0x${string}` =
  '0x0000000000000000000000000000000000000000000000000000000000000000';

function hashOperationBatch(
  targets: readonly `0x${string}`[],
  values: readonly bigint[],
  calldatas: readonly `0x${string}`[],
  salt: `0x${string}`
): `0x${string}` {
  return keccak256(
    encodeAbiParameters(
      [
        { type: 'address[]' },
        { type: 'uint256[]' },
        { type: 'bytes[]' },
        { type: 'bytes32' },
        { type: 'bytes32' }
      ],
      [targets, values, calldatas, ZERO_BYTES32, salt]
    )
  );
}

/**
 * Compute OpenZeppelin Governor's TimelockController operation id(s) for a
 * proposal. Returns two ids because the salt formula changed in OZ v5
 * (PR #4432, mid-2023): pre-v5 salt is `descriptionHash`, v5+ salt is
 * `bytes32(bytes20(governor)) ^ descriptionHash`. The predecessor is always
 * zero. We store both so a single handler works for both OZ variants without
 * per-governance version config.
 */
export function computeTimelockOperationIds({
  governor,
  targets,
  values,
  calldatas,
  descriptionHash
}: {
  governor: `0x${string}`;
  targets: readonly `0x${string}`[];
  values: readonly bigint[];
  calldatas: readonly `0x${string}`[];
  descriptionHash: `0x${string}`;
}): [`0x${string}`, `0x${string}`] {
  const governorSalt = toHex(
    (BigInt(governor) << 96n) ^ BigInt(descriptionHash),
    { size: 32 }
  );

  return [
    hashOperationBatch(targets, values, calldatas, descriptionHash),
    hashOperationBatch(targets, values, calldatas, governorSalt)
  ];
}

/**
 * Extract raw title from proposal body.
 * @param body proposal body
 * @returns raw title or null if not found
 */
export function getRawProposalTitle(body: string) {
  // Some Uniswap proposals were created with body like this.
  if (body === '""') return null;

  return body.split('\n', 1)[0]!;
}

/**
 * Extract and clean title from proposal body.
 * @param body proposal body
 * @returns cleaned title or null if not found
 */
export function getProposalTitle(body: string) {
  const rawTitle = getRawProposalTitle(body);
  return rawTitle?.replace(/^#+ +/, '').slice(0, 200) ?? null;
}

/**
 * Extract proposal body without title.
 * @param body proposal body
 * @returns body without title
 */
export function getProposalBody(body: string) {
  const title = getRawProposalTitle(body);
  if (!title) return body;

  return body.slice(title.length).trim();
}

/**
 * Convert Governor bravo choice value to common format.
 * Governor Bravo: 0=against, 1=for, 2=abstain
 * Common format uses 1 for For, 2 for Against, 3 for Abstain.
 * @param rawChoice onchain choice value
 * @returns common format choice value or null if unknown
 */
export function convertChoice(rawChoice: number): 1 | 2 | 3 | null {
  if (rawChoice === 0) return 2;
  if (rawChoice === 1) return 1;
  if (rawChoice === 2) return 3;

  return null;
}
