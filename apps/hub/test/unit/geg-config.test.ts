import { deriveScale } from '../../src/helpers/gegConfig';

/**
 * These used to pin `deriveMaxWeight(budget)` against a shared parity table encoding
 * `floor(1e6 / budget)` — the per-voter clamp. That clamp is gone (W1), and with it
 * the table: `packages/geg-parity/vectors/max-weight.json` describes behaviour the
 * system no longer has and is superseded by these assertions.
 *
 * What replaced it splits in two. `deriveScale` keeps the tally computable by
 * dividing every voter equally, and `deriveMaxWeight` is now only an anti-abuse
 * bound on what the eligibility issuer may attest.
 */
describe('deriveScale', () => {
  it('is 1 whenever the tally already fits — the case essentially every space takes', () => {
    // A 1e9-supply token at budget 100 is 1e11, well inside a 1e12 ceiling.
    expect(deriveScale(100, 1e9, 1e12)).toBe(1);
    expect(deriveScale(1, 1e12, 1e12)).toBe(1);
  });

  it('is a power of two, and the smallest one that fits', () => {
    // Smallest, so no proposal loses more precision than its ceiling forces.
    const scale = deriveScale(100, 5.9e14, 1e12);
    expect(Number.isInteger(Math.log2(scale))).toBe(true);
    expect(100 * Math.ceil(5.9e14 / scale)).toBeLessThanOrEqual(1e12);
    expect(100 * Math.ceil(5.9e14 / (scale / 2))).toBeGreaterThan(1e12);
  });

  it('tracks the budget, which is why it cannot be frozen at creation', () => {
    // An author may flip weighted → basic until voting opens. Budget 1 needs 100x
    // less bound than budget 100, so a stored scale would be 100x too small.
    const weighted = deriveScale(100, 5.9e14, 1e12);
    const basic = deriveScale(1, 5.9e14, 1e12);
    expect(basic).toBeLessThan(weighted);
  });

  it('grows with supply and shrinks with a larger ceiling', () => {
    expect(deriveScale(100, 1e15, 1e12)).toBeGreaterThan(
      deriveScale(100, 1e14, 1e12)
    );
    expect(deriveScale(100, 1e15, 1e14)).toBeLessThan(
      deriveScale(100, 1e15, 1e12)
    );
  });
});
