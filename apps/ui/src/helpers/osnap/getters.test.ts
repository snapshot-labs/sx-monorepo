import { describe, expect, it } from 'vitest';
import { getContractSubgraph, getOptimisticGovernorSubgraph } from './getters';

describe('getContractSubgraph', () => {
  it('should find matching subgraph', () => {
    expect(
      getContractSubgraph({ network: '1', name: 'OptimisticGovernor' })
    ).toBe(
      'https://subgrapher.snapshot.org/subgraph/arbitrum/DQpwhiRSPQJEuc8y6ZBGsFfNpfwFQ8NjmjLmfv8kBkLu'
    );
    expect(
      getContractSubgraph({ network: '1', name: 'OptimisticOracleV3' })
    ).toBe(
      'https://subgrapher.snapshot.org/subgraph/arbitrum/Bm3ytsa1YvcyFJahdfQQgscFQVCcMvoXujzkd3Cz6aof'
    );

    expect(
      getContractSubgraph({ network: '11155111', name: 'OptimisticGovernor' })
    ).toBe(
      'https://subgrapher.snapshot.org/subgraph/arbitrum/5pwrjCkpcpCd79k9MBS5yVgnsHQiw6afvXUfzqHjdRFw'
    );
    expect(
      getContractSubgraph({ network: '11155111', name: 'OptimisticOracleV3' })
    ).toBe(
      'https://subgrapher.snapshot.org/subgraph/arbitrum/78JbrMhcC9CVDZHDADvNcyhRrrccTJG4vCVBztyer1Xa'
    );
  });

  it('should throw error if no matching subgraph is found', () => {
    expect(() =>
      getContractSubgraph({ network: '1', name: 'OptimisticOracleV4' })
    ).toThrowError(
      'No subgraph url defined for OptimisticOracleV4 on network 1'
    );
  });
});

describe('getOptimisticGovernorSubgraph', () => {
  it('should return the subgraph url for the OptimisticGovernor contract', () => {
    expect(getOptimisticGovernorSubgraph('1')).toBe(
      'https://subgrapher.snapshot.org/subgraph/arbitrum/DQpwhiRSPQJEuc8y6ZBGsFfNpfwFQ8NjmjLmfv8kBkLu'
    );
    expect(getOptimisticGovernorSubgraph('11155111')).toBe(
      'https://subgrapher.snapshot.org/subgraph/arbitrum/5pwrjCkpcpCd79k9MBS5yVgnsHQiw6afvXUfzqHjdRFw'
    );
  });

  it('should throw error if no matching subgraph is found', () => {
    expect(() => getOptimisticGovernorSubgraph('2121')).toThrowError(
      'No subgraph url defined for OptimisticGovernor on network 2121'
    );
  });
});
