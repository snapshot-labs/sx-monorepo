/**
 * Hub's real per-ballot BLS path at election scale: mint one credential per
 * ballot, the way `GET /te_geg_ballots` does on every read a keyper makes.
 *
 * The blst WASM heap is a fixed 16 MB and does not grow, so a per-call leak
 * shows up as an abort partway through a large election rather than as slow
 * degradation. This is the run that says whether that ceiling is anywhere near.
 *
 *   bun run benchmarks/attestation-mint-scale.ts     # N_MINT=30000 by default
 */
import { keccak256 } from '@ethersproject/keccak256';
import {
  encodeSchnorr,
  initCurves,
  schnorrKeygen,
  schnorrSign
} from '@shutter-network/urban-verified-crypto';

const N = Number(process.env.N_MINT ?? 30000);

const hexToBytes = (h: string) => {
  const s = h.startsWith('0x') ? h.slice(2) : h;
  const out = new Uint8Array(s.length / 2);
  for (let i = 0; i < out.length; i++)
    out[i] = parseInt(s.slice(i * 2, i * 2 + 2), 16);
  return out;
};

async function main() {
  await initCurves();
  const { sk, vk } = schnorrKeygen();
  const t0 = performance.now();
  for (let i = 0; i < N; i++) {
    const msg = hexToBytes(keccak256(new Uint8Array(32).fill(i % 251)));
    const sig = encodeSchnorr(schnorrSign(sk, vk, msg));
    if (sig.length !== 80) throw new Error(`bad sig length ${sig.length}`);
    if ((i + 1) % 2000 === 0) {
      console.log(
        `mint ${i + 1}/${N}  rss=${Math.round(process.memoryUsage().rss / 1048576)}MB  ${((performance.now() - t0) / 1000).toFixed(0)}s`
      );
    }
  }
  console.log(`MINT OK: ${N} attestations`);
}

main().catch(err => {
  console.error(`FAILED: ${err?.message || err}`);
  process.exit(1);
});
