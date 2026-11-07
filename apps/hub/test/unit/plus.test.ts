import { formatSpace } from '../../src/graphql/helpers';

jest.mock('../../src/helpers/mysql', () => ({
  __esModule: true,
  default: { queryAsync: jest.fn() }
}));

const FEE = 8_000_000; // gwei
// Read with the space, as a string like other option values
const FEE_COLUMN: Record<string, any> = { plus_proposal_fee: String(FEE) };

function isPlus(fields: Record<string, any>) {
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
    ...FEE_COLUMN,
    ...fields
  }).plus;
}

describe('formatSpace plus', () => {
  it('should be Plus when the balance covers a proposal', () => {
    expect(isPlus({ credits_deposited: FEE })).toBe(true);
  });

  it('should not be Plus below the proposal fee', () => {
    expect(isPlus({ credits_deposited: FEE, credits_spent: 1 })).toBe(false);
  });

  it('should not be Plus with an active Pro subscription', () => {
    const turboExpiration = Math.floor(Date.now() / 1e3) + 86400;
    expect(isPlus({ credits_deposited: FEE, turboExpiration })).toBe(false);
  });

  it('should not be Plus on spaces nested in other entities', () => {
    expect(isPlus({ plus_proposal_fee: undefined })).toBe(false);
  });
});
