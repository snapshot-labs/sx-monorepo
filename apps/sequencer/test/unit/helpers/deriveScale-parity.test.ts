/**
 * The sequencer and the hub must derive the same `scale` from the same inputs.
 *
 * The sequencer writes it into `te_config`, and the hub derives it again for the
 * ballot feed the committee counts from. If they disagree, every published score
 * is off by the difference.
 */

import { deriveScale } from '../../../src/helpers/teCommittee';

// Loaded at run time, because a static import would pull a hub file into the
// sequencer's typecheck.
const { deriveScale: hubDeriveScale } = jest.requireActual(
  '../../../../hub/src/helpers/sgpConfig'
) as { deriveScale: typeof deriveScale };

const BUDGETS = [1, 7, 100];
const WEIGHTS = [0, 1, 999, 1e6, 1e10, 1e10 + 1, 1e12, 1e13, 4e17, 2 ** 53 + 2];
const CEILINGS = [1, 1e6, 1e9, 1e12, 1e14, Infinity];

describe('deriveScale: sequencer and hub agree', () => {
  it.each(
    BUDGETS.flatMap(budget =>
      WEIGHTS.flatMap(weight =>
        CEILINGS.map(ceiling => [budget, weight, ceiling] as const)
      )
    )
  )('budget %p, V %p, ceiling %p', (budget, weight, ceiling) => {
    expect(hubDeriveScale(budget, weight, ceiling)).toBe(
      deriveScale(budget, weight, ceiling)
    );
  });
});
