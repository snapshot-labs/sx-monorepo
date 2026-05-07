import { afterEach, describe, expect, it, vi } from 'vitest';
import { decryptHandles, encryptChoice, getZap } from '../../src/inco';

const SPACE = '0xCb8eB47d52286c0FC1b5a0F4e0720f2e7Db077AC' as const;
const VOTER = '0xc6377415Ee98A7b71161Ee963603eE52fF7750FC' as const;
const QUORUM_HANDLE =
  '0x0a0fe5db2c6386c38cb47596b62e0864f930efdd2aecc8f87b123da4deeb0800' as const;
const SUPPORT_HANDLE =
  '0xc83c2db2c212ea1781fd1428360834770a2ded50a8ddc8403e5d1d79f4370800' as const;

const handleTypes = { euint256: 'euint256-marker' };
const supportedChains = { baseSepolia84532: { id: 84532 } };

const lightningInstance = {
  encrypt: vi.fn(async () => '0xdeadbeef' as `0x${string}`),
  attestedDecrypt: vi.fn(async (_w: unknown, handles: string[]) => {
    void _w;
    return handles.map((h, i) => ({
      handle: h,
      plaintext: { value: i === 0 ? 1n : true },
      covalidatorSignatures: [new Uint8Array([0xaa, 0xbb, 0xcc])]
    }));
  })
};

const Lightning = {
  latest: vi.fn(() => lightningInstance)
};

vi.mock('@inco/js/lite', () => ({ Lightning }));
vi.mock('@inco/js', () => ({ supportedChains, handleTypes }));

describe('inco wrapper', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('builds a zap from the testnet pepper + Base Sepolia chainId', async () => {
    const publicClient = { kind: 'public' };
    const zap = await getZap(publicClient as unknown);
    expect(Lightning.latest).toHaveBeenCalledWith('testnet', 84532);
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

  it('formats decryption results into the shape Space.tryExecute expects', async () => {
    const walletClient = { kind: 'wallet' };
    const results = await decryptHandles({
      zap: lightningInstance,
      walletClient: walletClient as unknown,
      handles: [QUORUM_HANDLE, SUPPORT_HANDLE]
    });

    expect(results).toHaveLength(2);
    const [first, second] = results;
    if (!first || !second)
      throw new Error('decryptHandles returned <2 results');

    // First result: bigint plaintext = 1
    expect(first.handle).toBe(QUORUM_HANDLE);
    expect(first.value).toBe(1n);
    expect(first.attestation.handle).toBe(QUORUM_HANDLE);
    expect(first.attestation.value).toBe(
      '0x0000000000000000000000000000000000000000000000000000000000000001'
    );
    expect(first.signatures).toEqual(['0xaabbcc']);

    // Second result: boolean true → encoded as 32-byte 1
    expect(second.handle).toBe(SUPPORT_HANDLE);
    expect(second.value).toBe(true);
    expect(second.attestation.value).toBe(
      '0x0000000000000000000000000000000000000000000000000000000000000001'
    );
  });

  it('encodes boolean false attestation as 32-byte zero', async () => {
    lightningInstance.attestedDecrypt.mockResolvedValueOnce([
      {
        handle: QUORUM_HANDLE,
        plaintext: { value: false },
        covalidatorSignatures: [new Uint8Array([0x01])]
      }
    ]);

    const [r] = await decryptHandles({
      zap: lightningInstance,
      walletClient: {} as unknown,
      handles: [QUORUM_HANDLE]
    });
    if (!r) throw new Error('decryptHandles returned no results');

    expect(r.value).toBe(false);
    expect(r.attestation.value).toBe(
      '0x0000000000000000000000000000000000000000000000000000000000000000'
    );
    expect(r.signatures).toEqual(['0x01']);
  });
});
