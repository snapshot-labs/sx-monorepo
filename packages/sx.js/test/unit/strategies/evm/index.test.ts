import { afterEach, describe, expect, it, vi } from 'vitest';
import { getStrategiesWithParams } from '../../../../src/strategies/evm';
import { encodeOracleParams } from '../../../../src/strategies/evm/oracle';
import { VotingPowerDetailsError } from '../../../../src/utils/errors';

const VANILLA = '0xC1245C5DCa7885C73E32294140F1e5d30688c202';
const WHITELIST = '0x34f0AfFF5A739bBf3E285615F50e40ddAaf2A829';
const ORACLE = '0x59db2D5A9dC316bdc8015172Cf80891d95E2D201';
const config = {
  networkConfig: {
    eip712ChainId: 11155111,
    strategies: {
      [VANILLA]: { type: 'vanilla' },
      [WHITELIST]: { type: 'whitelist' },
      [ORACLE]: { type: 'oracle' }
    }
  } as any,
  whitelistServerUrl: '',
  provider: {} as any
};
const data = {
  space: '0x0000000000000000000000000000000000000001',
  authenticator: '0x0',
  strategies: [],
  executionStrategy: { addr: '0x0', params: '0x' },
  metadataUri: '',
  blockNumber: 12_000_000
};
const oracleParams = encodeOracleParams(
  '0x00000000000000000000000000000000000000AA',
  { id: 'eth-balance', network: '11155111', decimals: 18, params: {} }
);

describe('getStrategiesWithParams', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should skip strategies the signer has no power with', async () => {
    const result = await getStrategiesWithParams(
      'propose',
      [
        { index: 0, address: VANILLA, params: '0x' },
        // No whitelist tree, so the signer is not in it
        { index: 1, address: WHITELIST, params: '0x', metadata: {} }
      ],
      '0x537f1896541d28F4c70116EEa602b1B34Da95163',
      data,
      config
    );

    expect(result.map(r => r.index)).toEqual([0]);
  });

  it('should fail instead of dropping voting power that could not be loaded', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ json: async () => ({ error: { data: 'down' } }) }))
    );

    await expect(
      getStrategiesWithParams(
        'propose',
        [
          { index: 0, address: VANILLA, params: '0x' },
          { index: 1, address: ORACLE, params: oracleParams }
        ],
        '0x537f1896541d28F4c70116EEa602b1B34Da95163',
        data,
        config
      )
    ).rejects.toBeInstanceOf(VotingPowerDetailsError);
  });
});
