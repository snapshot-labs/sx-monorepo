import { formatSpace } from '../../src/graphql/helpers';

const PROPOSAL_FEE = 8_000_000; // gwei

jest.mock('../../src/helpers/mysql', () => ({
  __esModule: true,
  default: { queryAsync: jest.fn() }
}));

let isOptionsLoaded = true;

jest.mock('../../src/helpers/options', () => ({
  getNumberOption: (name: string) => {
    if (!isOptionsLoaded) return null;
    return name === 'space.plus.proposal_fee' ? PROPOSAL_FEE : 0;
  }
}));

function space(fields: Record<string, any>) {
  return formatSpace({
    id: 'plus.eth',
    settings: '{}',
    domain: null,
    verified: false,
    turboExpiration: 0,
    flagged: 0,
    hibernated: 0,
    skinSettings: null,
    created: 0,
    ...fields
  });
}

describe('formatSpace plus', () => {
  it('should be Plus when the balance covers a proposal', () => {
    expect(space({ credits_deposited: PROPOSAL_FEE }).plus).toBe(true);
  });

  it('should not be Plus when the balance is below the proposal fee', () => {
    expect(
      space({ credits_deposited: PROPOSAL_FEE, credits_spent: 1 }).plus
    ).toBe(false);
  });

  it('should not be Plus with an active Pro subscription', () => {
    const turboExpiration = Math.floor(Date.now() / 1e3) + 86400;
    expect(
      space({ credits_deposited: PROPOSAL_FEE, turboExpiration }).plus
    ).toBe(false);
  });

  it('should not be Plus on spaces nested in other entities', () => {
    expect(space({}).plus).toBe(false);
  });

  it('should not be Plus before the options load', () => {
    isOptionsLoaded = false;
    expect(space({ credits_deposited: PROPOSAL_FEE }).plus).toBe(false);
    isOptionsLoaded = true;
  });
});
