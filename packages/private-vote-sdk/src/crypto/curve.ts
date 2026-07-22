/**
 * Typed wrappers over BLST's raw WASM bindings for the two curve points.
 *
 * Scalars are plain `bigint`s — see `field.ts` and the plan §4.1 deviation
 * note. The wrappers survive here because BLST's raw API has two specific
 * footguns we want to enforce away:
 *   1. `fromBytes` always runs `on_curve` + `in_group` before accepting
 *      a compressed point.
 *   2. `add` / `mul` / `neg` dup before mutating, so operations are pure
 *      from the caller's point of view.
 *
 * Serialisation is always the 48 / 96-byte compressed BLS12-381 encoding
 * that the on-chain contract consumes (§2 of the dev plan).
 */

import type { P1 as BlstP1, P2 as BlstP2 } from './blst/types';
import { blst } from './init';
import { SCALAR_BYTES, bigIntToBytesBE, modQ } from './field';

/**
 * Release WASM memory for BLST-wrapped objects once their JS wrapper is
 * garbage-collected. The vendored `blst.js` allocates every curve point
 * and scalar in the WASM heap (fixed 16MB, no `ALLOW_MEMORY_GROWTH`);
 * without this registry, long-running consumers — keypers, tally
 * aggregators, bench suites — exhaust the heap after a few thousand ops.
 *
 * We do NOT use `blst.destroy(inner)` here because of a bug in the
 * Emscripten-generated `__destroy__`:
 *
 *   P2.prototype.__destroy__ = function() {
 *     _P2__destroy__0(this.ptr);   // calls WASM destructor
 *     this.ptr = 0;                // zeroes the pointer — happens BEFORE …
 *   };
 *   function destroy(obj) {
 *     obj.__destroy__();
 *     delete getCache(obj.__class__)[obj.ptr]; // … reads ptr here — always 0!
 *   }
 *
 * Because `obj.ptr` is 0 by the time `destroy` tries to clear the cache,
 * it deletes `cache[0]` instead of `cache[originalPtr]`. The original
 * entry persists forever. When the WASM allocator reuses `originalPtr` for
 * a new object, `wrapPointer(originalPtr, klass)` returns the stale
 * wrapper (with `ptr = 0`). Any WASM call on that wrapper uses address 0,
 * producing garbage results — the nondeterministic VALID/INVALID bug.
 *
 * Fix: capture `ptr` and the class's prototype at registration time, then
 * in the callback call `__destroy__` with the original pointer and delete
 * the correct cache entry via `klass.__cache__[ptr]`.
 */
type BlstHeld = {
  readonly ptr: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly klass: { __cache__?: Record<number, object>; prototype: { __destroy__(): void } };
};

const blstRegistry = new FinalizationRegistry<BlstHeld>(({ ptr, klass }) => {
  try {
    // Call __destroy__ with the original (pre-zero) pointer.
    klass.prototype.__destroy__.call({ ptr });
    // Delete the correct cache entry — Emscripten's own destroy() would
    // delete cache[0] here due to the ptr-zeroing bug described above.
    if (klass.__cache__) delete klass.__cache__[ptr];
  } catch {
    // Module tear-down or already-destroyed; nothing useful to do here.
  }
});

function trackPoint<T extends object>(wrapper: object, inner: T): T {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const held = inner as any;
  // Pass wrapper as the unregister token so destroyWasm() can cancel the
  // registry entry before freeing, preventing FinalizationRegistry from
  // calling __destroy__ on already-freed (and potentially reused) WASM memory.
  blstRegistry.register(wrapper, { ptr: held.ptr as number, klass: held.__class__ }, wrapper);
  return inner;
}

/**
 * Encode a scalar (bigint) as the BLST Scalar object expected by `mult`.
 * The returned object owns a WASM allocation; callers must destroyWasm
 * it after use, or the WASM heap leaks.
 */
function blstScalar(s: bigint) {
  const be = bigIntToBytesBE(modQ(s), SCALAR_BYTES);
  const scalar = new (blst().Scalar)();
  scalar.from_bendian(be);
  return scalar;
}

function destroyWasm(obj: object): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const held = obj as any;
  const ptr: number = held.ptr;
  const klass = held.__class__;
  try {
    klass.prototype.__destroy__.call({ ptr });
    if (klass.__cache__) delete klass.__cache__[ptr];
  } catch {
    // best-effort — same rationale as the registry callback.
  }
}

// ---------- G1 (voter verification keys, Schnorr) ----------

export const G1_BYTES = 48;

export class G1Point {
  constructor(readonly inner: BlstP1) {
    trackPoint(this, inner);
  }

  static generator(): G1Point {
    // P1.generator() allocates a NEW heap copy of the static generator (it does
    // `new P1(static_gen)`) and stores it in P1.__cache__.  We dup() it to get our
    // owned copy, then immediately free the intermediate — otherwise the P1.__cache__
    // entry for the generator copy accumulates forever (144 bytes × every call).
    const raw = blst().P1.generator();
    const dup = raw.dup();
    destroyWasm(raw);
    return new G1Point(dup);
  }

  static identity(): G1Point {
    return new G1Point(new (blst().P1)());
  }

  static fromBytes(b: Uint8Array): G1Point {
    if (b.length !== G1_BYTES) {
      throw new Error(`G1Point.fromBytes: expected 48 bytes, got ${b.length}`);
    }
    const p = new (blst().P1)(b);
    if (!p.on_curve()) {
      destroyWasm(p);
      throw new Error('G1Point.fromBytes: point not on curve');
    }
    if (!p.in_group()) {
      destroyWasm(p);
      throw new Error('G1Point.fromBytes: point not in prime-order subgroup');
    }
    return new G1Point(p);
  }

  static hashToCurve(msg: Uint8Array, dst: Uint8Array): G1Point {
    const p = new (blst().P1)();
    p.hash_to(msg, new TextDecoder().decode(dst));
    return new G1Point(p);
  }

  toBytes(): Uint8Array {
    return this.inner.compress();
  }

  isIdentity(): boolean {
    return this.inner.is_inf();
  }

  add(o: G1Point): G1Point {
    return new G1Point(this.inner.dup().add(o.inner));
  }

  sub(o: G1Point): G1Point {
    const neg_o = o.neg();
    const result = this.add(neg_o);
    neg_o.destroyWasm();
    return result;
  }

  neg(): G1Point {
    return new G1Point(this.inner.dup().neg());
  }

  mul(s: bigint): G1Point {
    const scalar = blstScalar(s);
    const out = new G1Point(this.inner.dup().mult(scalar));
    destroyWasm(scalar);
    return out;
  }

  equals(o: G1Point): boolean {
    return this.inner.is_equal(o.inner);
  }

  destroyWasm(): void {
    blstRegistry.unregister(this);
    destroyWasm(this.inner);
  }
}

// ---------- G2 (encryption group; mpk, C1, C2 all live here) ----------

export const G2_BYTES = 96;

export class G2Point {
  constructor(readonly inner: BlstP2) {
    trackPoint(this, inner);
  }

  static generator(): G2Point {
    // Same as G1Point.generator(): P2.generator() allocates a new heap copy,
    // stored in P2.__cache__.  Free it after dup() to avoid the per-call leak
    // of 288 bytes (≈ 17 calls/ballot × 288 B × 2000 ballots ≈ 9.5 MB → OOM).
    const raw = blst().P2.generator();
    const dup = raw.dup();
    destroyWasm(raw);
    return new G2Point(dup);
  }

  static identity(): G2Point {
    return new G2Point(new (blst().P2)());
  }

  static fromBytes(b: Uint8Array): G2Point {
    if (b.length !== G2_BYTES) {
      throw new Error(`G2Point.fromBytes: expected 96 bytes, got ${b.length}`);
    }
    const p = new (blst().P2)(b);
    if (!p.on_curve()) {
      destroyWasm(p);
      throw new Error('G2Point.fromBytes: point not on curve');
    }
    if (!p.in_group()) {
      destroyWasm(p);
      throw new Error('G2Point.fromBytes: point not in prime-order subgroup');
    }
    return new G2Point(p);
  }

  static hashToCurve(msg: Uint8Array, dst: Uint8Array): G2Point {
    const p = new (blst().P2)();
    p.hash_to(msg, new TextDecoder().decode(dst));
    return new G2Point(p);
  }

  toBytes(): Uint8Array {
    return this.inner.compress();
  }

  isIdentity(): boolean {
    return this.inner.is_inf();
  }

  add(o: G2Point): G2Point {
    return new G2Point(this.inner.dup().add(o.inner));
  }

  sub(o: G2Point): G2Point {
    const neg_o = o.neg();
    const result = this.add(neg_o);
    neg_o.destroyWasm();
    return result;
  }

  neg(): G2Point {
    return new G2Point(this.inner.dup().neg());
  }

  mul(s: bigint): G2Point {
    const scalar = blstScalar(s);
    const out = new G2Point(this.inner.dup().mult(scalar));
    destroyWasm(scalar);
    return out;
  }

  equals(o: G2Point): boolean {
    return this.inner.is_equal(o.inner);
  }

  destroyWasm(): void {
    blstRegistry.unregister(this);
    destroyWasm(this.inner);
  }
}
