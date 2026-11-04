/**
 * A minted eligibility credential must pass the SDK's check, which the keypers
 * also use.
 */

import {
  initCurves,
  schnorrKeygen,
  verifyAttestation
} from '@shutter-network/urban-verified-crypto';
import {
  eligibilityPublicKey,
  MintArgs,
  mintAttestation,
  resetIssuer
} from '../../../src/helpers/sgpAttestation';

const bytes = (hex: string) => new Uint8Array(Buffer.from(hex.slice(2), 'hex'));

describe('mintAttestation', () => {
  const ISSUER_SK =
    '0x0000000000000000000000000000000000000000000000000000000000002a2a';
  const electionId = `0x${'11'.repeat(32)}`;
  const pseudonym = `0x${'22'.repeat(32)}`;
  let vk: string;

  beforeAll(async () => {
    await initCurves();
    process.env.TE_ELIGIBILITY_PRIVATE_KEY = ISSUER_SK;
    resetIssuer();
    const voter = schnorrKeygen(0x5151n);
    vk = `0x${Buffer.from(voter.vk.toBytes()).toString('hex')}`;
    voter.vk.destroyWasm();
  });

  const base = (): MintArgs => ({
    electionId,
    pseudonym,
    vk,
    weight: 7n,
    nonce: 3n
  });

  async function verifies(args: MintArgs, signature: string) {
    return verifyAttestation(
      bytes(await eligibilityPublicKey()),
      {
        electionId: bytes(args.electionId),
        pseudonym: bytes(args.pseudonym),
        vk: bytes(args.vk),
        weight: args.weight,
        nonce: args.nonce,
        signature: bytes(signature)
      },
      { electionId: bytes(electionId) }
    );
  }

  it('mints a credential the SDK accepts, at any weight', async () => {
    for (const weight of [7n, 1_000_000_000n]) {
      const args = { ...base(), weight };
      expect(await verifies(args, await mintAttestation(args))).toBe(true);
    }
  });

  it.each([
    ['weight', { weight: 0n }],
    ['nonce', { nonce: 0n }]
  ])('refuses to mint a %s below 1', async (label, override) => {
    await expect(mintAttestation({ ...base(), ...override })).rejects.toThrow(
      `${label} must be >= 1`
    );
  });
});
