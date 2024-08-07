import { describe, expect, it } from 'vitest';
import {
  getContractSubgraph,
  getOptimisticGovernorSubgraph,
  getProposalHashFromTransactions
} from './getters';

describe('getProposalHashFromTransactions', () => {
  it('should return the correct proposal hash', () => {
    const transactions = [
      {
        _type: 'raw' as const,
        to: '0x556B14CbdA79A36dC33FcD461a04A5BCb5dC2A70',
        data: '0x',
        value: '1',
        salt: '',
        _form: {
          recipient: '0x556B14CbdA79A36dC33FcD461a04A5BCb5dC2A70'
        }
      }
    ];

    expect(getProposalHashFromTransactions(transactions)).toBe(
      '0xd3fe3461bb3a4817f818ca094ecbbd685d7019f0c246553dae1d3fecbebe6cb3'
    );
  });
});

describe('getContractSubgraph', () => {
  it('should find matching subgraph', () => {
    expect(
      getContractSubgraph({ chainId: 1, name: 'OptimisticGovernor' })
    ).toBe(
      'https://subgrapher.snapshot.org/subgraph/arbitrum/DQpwhiRSPQJEuc8y6ZBGsFfNpfwFQ8NjmjLmfv8kBkLu'
    );
    expect(
      getContractSubgraph({ chainId: 1, name: 'OptimisticOracleV3' })
    ).toBe(
      'https://subgrapher.snapshot.org/subgraph/arbitrum/Bm3ytsa1YvcyFJahdfQQgscFQVCcMvoXujzkd3Cz6aof'
    );

    expect(
      getContractSubgraph({ chainId: 11155111, name: 'OptimisticGovernor' })
    ).toBe(
      'https://subgrapher.snapshot.org/subgraph/arbitrum/5pwrjCkpcpCd79k9MBS5yVgnsHQiw6afvXUfzqHjdRFw'
    );
    expect(
      getContractSubgraph({ chainId: 11155111, name: 'OptimisticOracleV3' })
    ).toBe(
      'https://subgrapher.snapshot.org/subgraph/arbitrum/78JbrMhcC9CVDZHDADvNcyhRrrccTJG4vCVBztyer1Xa'
    );
  });

  it('should throw error if no matching subgraph is found', () => {
    expect(() =>
      getContractSubgraph({ chainId: 1, name: 'OptimisticOracleV4' })
    ).toThrowError(
      'No subgraph url defined for OptimisticOracleV4 on network 1'
    );
  });
});

describe('getOptimisticGovernorSubgraph', () => {
  it('should return the subgraph url for the OptimisticGovernor contract', () => {
    expect(getOptimisticGovernorSubgraph(1)).toBe(
      'https://subgrapher.snapshot.org/subgraph/arbitrum/DQpwhiRSPQJEuc8y6ZBGsFfNpfwFQ8NjmjLmfv8kBkLu'
    );
    expect(getOptimisticGovernorSubgraph(11155111)).toBe(
      'https://subgrapher.snapshot.org/subgraph/arbitrum/5pwrjCkpcpCd79k9MBS5yVgnsHQiw6afvXUfzqHjdRFw'
    );
  });

  it('should throw error if no matching subgraph is found', () => {
    expect(() => getOptimisticGovernorSubgraph(2121)).toThrowError(
      'No subgraph url defined for OptimisticGovernor on network 2121'
    );
  });
});
