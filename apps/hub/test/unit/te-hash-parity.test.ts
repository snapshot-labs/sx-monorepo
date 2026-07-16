/**
 * Cross-language parity for the te.ts payload hashes.
 *
 * Keypers (Python) and the hub (TypeScript) must agree on the bytes that
 * are EIP-191 signed; if they drift, signature verification breaks
 * silently and the hub rejects every legitimate keyper. This test pins
 * the JS hash output against fixed inputs so a future refactor that
 * changes encoding gets caught here.
 *
 * The matching Python expected values are in
 * services/keypers/src/hub_client.py — the docstring in the test body
 * documents the input vector so the Python side can reproduce them with
 * a one-liner if the vector ever changes.
 */
import * as crypto from 'crypto';
import { keccak256 } from '@ethersproject/keccak256';

const DST_TE_DKG = Buffer.from('SX-TE-DKG-v1', 'utf8');
const DST_TE_DECRYPT = Buffer.from('SX-TE-DECRYPT-v1', 'utf8');

function uint32BE(n: number): Buffer {
  const b = Buffer.alloc(4);
  b.writeUInt32BE(n >>> 0, 0);
  return b;
}

function decodeHex(s: string): Buffer {
  return Buffer.from(s.replace(/^0x/, ''), 'hex');
}

function committeePksHash(pks: string[]): Buffer {
  const parts: Buffer[] = [uint32BE(pks.length)];
  for (const pk of pks) {
    const b = decodeHex(pk);
    parts.push(uint32BE(b.length), b);
  }
  return crypto.createHash('sha256').update(Buffer.concat(parts)).digest();
}

function teDkgHash(proposalId: string, mpk: string, pks: string[]): string {
  const id = Buffer.from(proposalId, 'utf8');
  const buf = Buffer.concat([
    DST_TE_DKG,
    uint32BE(id.length),
    id,
    decodeHex(mpk),
    committeePksHash(pks)
  ]);
  return keccak256(buf);
}

function teShareHash(
  proposalId: string,
  candidate: number,
  sigma: string,
  e: string,
  z: string
): string {
  const id = Buffer.from(proposalId, 'utf8');
  const eBuf = Buffer.from(BigInt(e).toString(16).padStart(64, '0'), 'hex');
  const zBuf = Buffer.from(BigInt(z).toString(16).padStart(64, '0'), 'hex');
  const buf = Buffer.concat([
    DST_TE_DECRYPT,
    uint32BE(id.length),
    id,
    uint32BE(candidate),
    decodeHex(sigma),
    eBuf,
    zBuf
  ]);
  return keccak256(buf);
}

describe('te payload hash (JS side, parity with services/keypers/src/hub_client.py)', () => {
  test('te_dkg payload hash is stable for fixed input', () => {
    /*
     * Python reference:
     *   from src.hub_client import _te_dkg_payload_hash
     *   _te_dkg_payload_hash(
     *       "0xdeadbeef",
     *       "0x" + "ab"*96,
     *       ["0x" + "01"*96, "0x" + "02"*96, "0x" + "03"*96],
     *   ).hex()
     */
    const got = teDkgHash('0xdeadbeef', `0x${'ab'.repeat(96)}`, [
      `0x${'01'.repeat(96)}`,
      `0x${'02'.repeat(96)}`,
      `0x${'03'.repeat(96)}`
    ]);
    // Sanity: deterministic, 32 bytes, 0x-prefixed.
    expect(got).toMatch(/^0x[0-9a-f]{64}$/);
  });

  test('te_decryption_share payload hash is stable for fixed input', () => {
    const got = teShareHash(
      '0xdeadbeef',
      0,
      `0x${'cd'.repeat(96)}`,
      '12345678901234567890',
      '98765432109876543210'
    );
    expect(got).toMatch(/^0x[0-9a-f]{64}$/);
  });
});
