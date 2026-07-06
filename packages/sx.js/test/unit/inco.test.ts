import { afterEach, describe, expect, it, vi } from 'vitest';
import { decryptHandles, encryptChoice, getFee, getZap } from '../../src/inco';

const SPACE = '0xCb8eB47d52286c0FC1b5a0F4e0720f2e7Db077AC' as const;
const VOTER = '0xc6377415Ee98A7b71161Ee963603eE52fF7750FC' as const;
const AGAINST_HANDLE =
  '0x0a0fe5db2c6386c38cb47596b62e0864f930efdd2aecc8f87b123da4deeb0800' as const;
const FOR_HANDLE =
  '0xc83c2db2c212ea1781fd1428360834770a2ded50a8ddc8403e5d1d79f4370800' as const;
const ABSTAIN_HANDLE =
  '0x1111111111111111111111111111111111111111111111111111111111110800' as const;

const handleTypes = { euint256: 'euint256-marker' };

const lightningInstance = {
  executorAddress: '0x168FDc3Ae19A5d5b03614578C58974FF30FCBe92',
  encrypt: vi.fn(async () => '0xdeadbeef' as `0x${string}`),
  attestedDecrypt: vi.fn(async (_w: unknown, handles: string[]) => {
    void _w;
    // Tally counts: against=2, for=5, abstain=1.
    const counts = [2n, 5n, 1n];
    return handles.map((h, i) => ({
      handle: h,
      plaintext: { value: counts[i] ?? 0n },
      covalidatorSignatures: [new Uint8Array([0xaa, 0xbb, 0xcc])]
    }));
  })
};

const Lightning = {
  baseSepoliaTestnet: vi.fn(async () => lightningInstance)
};

vi.mock('@inco/lightning-js/lite', () => ({ Lightning }));
// unwrap() probes mod.Lightning; expose on both mocks.
vi.mock('@inco/lightning-js', () => ({ Lightning, handleTypes }));

describe('inco wrapper', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('builds a zap from the Base Sepolia testnet factory', async () => {
    const zap = await getZap();
    expect(Lightning.baseSepoliaTestnet).toHaveBeenCalled();
    expect(zap).toBe(lightningInstance);
  });

  it('encrypts the choice bound to (voter, space) with euint256 handleType', async () => {
    const ciphertext = await encryptChoice({
      zap: lightningInstance,
      space: SPACE,
      voter: VOTER,
      choice: 1n
    });
    expect(ciphertext).toBe('0xdeadbeef');
    expect(lightningInstance.encrypt).toHaveBeenCalledWith(1n, {
      accountAddress: VOTER,
      dappAddress: SPACE,
      handleType: handleTypes.euint256
    });
  });

  it('reads the per-vote fee from the executor contract', async () => {
    const readContract = vi.fn(async () => 1234n);
    const fee = await getFee({
      zap: lightningInstance,
      publicClient: { readContract } as unknown
    });
    expect(fee).toBe(1234n);
    expect(readContract).toHaveBeenCalledWith(
      expect.objectContaining({
        address: lightningInstance.executorAddress,
        functionName: 'getFee'
      })
    );
  });

  it('formats the three tally decryptions into the shape Space.finalizeReveal expects', async () => {
    const walletClient = { kind: 'wallet' };
    const results = await decryptHandles({
      zap: lightningInstance,
      walletClient: walletClient as unknown,
      handles: [AGAINST_HANDLE, FOR_HANDLE, ABSTAIN_HANDLE]
    });

    expect(results).toHaveLength(3);
    const [against, forResult, abstain] = results;
    if (!against || !forResult || !abstain)
      throw new Error('decryptHandles returned <3 results');

    expect(against.handle).toBe(AGAINST_HANDLE);
    expect(against.value).toBe(2n);
    expect(against.attestation.handle).toBe(AGAINST_HANDLE);
    expect(against.attestation.value).toBe(
      '0x0000000000000000000000000000000000000000000000000000000000000002'
    );
    expect(against.signatures).toEqual(['0xaabbcc']);

    expect(forResult.value).toBe(5n);
    expect(forResult.attestation.value).toBe(
      '0x0000000000000000000000000000000000000000000000000000000000000005'
    );

    expect(abstain.value).toBe(1n);
    expect(abstain.attestation.value).toBe(
      '0x0000000000000000000000000000000000000000000000000000000000000001'
    );
  });

  it('encodes a zero tally as 32-byte zero', async () => {
    lightningInstance.attestedDecrypt.mockResolvedValueOnce([
      {
        handle: AGAINST_HANDLE,
        plaintext: { value: 0n },
        covalidatorSignatures: [new Uint8Array([0x01])]
      }
    ]);

    const [r] = await decryptHandles({
      zap: lightningInstance,
      walletClient: {} as unknown,
      handles: [AGAINST_HANDLE]
    });
    if (!r) throw new Error('decryptHandles returned no results');

    expect(r.value).toBe(0n);
    expect(r.attestation.value).toBe(
      '0x0000000000000000000000000000000000000000000000000000000000000000'
    );
    expect(r.signatures).toEqual(['0x01']);
  });
});
