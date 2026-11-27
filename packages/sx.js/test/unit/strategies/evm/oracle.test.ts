import { defaultAbiCoder, Interface } from '@ethersproject/abi';
import { StaticJsonRpcProvider } from '@ethersproject/providers';
import { toUtf8String } from '@ethersproject/strings';
import { afterEach, describe, expect, it, vi } from 'vitest';
import createOracleStrategy, {
  canonicalize,
  DEFAULT_ORACLE_URL,
  encodeOracleParams
} from '../../../../src/strategies/evm/oracle';
import { VotingPowerDetailsError } from '../../../../src/utils/errors';

const STRATEGY = '0x59db2D5A9dC316bdc8015172Cf80891d95E2D201';
const ORACLE = '0x00000000000000000000000000000000000000AA';
const VOTER = '0x537f1896541d28F4c70116EEa602b1B34Da95163';
const params = encodeOracleParams(ORACLE, {
  id: 'erc20-balance-of',
  network: '11155111',
  decimals: 18,
  params: { symbol: 'TKN', address: '0x0' }
});
const [, oracleParams] = defaultAbiCoder.decode(['address', 'bytes'], params);
const SAFE_HEAD = 12_000_050;
const strategyInterface = new Interface([
  'function getVotingPower(uint32 blockNumber, address voter, bytes params, bytes userParams) view returns (uint256)'
]);
// The strategy contract: counts the signed voting power it is given
const provider = {
  _isProvider: true,
  getNetwork: async () => ({ chainId: 11155111 }),
  getBlock: vi.fn(async () => ({ number: SAFE_HEAD })),
  call: vi.fn(async ({ data }: { data: string }) => {
    const [, , , userParams] = strategyInterface.decodeFunctionData(
      'getVotingPower',
      data
    );
    const [vp] = defaultAbiCoder.decode(['uint256', 'bytes'], userParams);
    return strategyInterface.encodeFunctionResult('getVotingPower', [vp]);
  })
} as any;
const clientConfig = {
  networkConfig: { eip712ChainId: 11155111 } as any,
  whitelistServerUrl: '',
  provider
};
const proposeData = {
  space: '0x0000000000000000000000000000000000000001',
  authenticator: '0x0',
  strategies: [],
  executionStrategy: { addr: '0x0', params: '0x' },
  metadataUri: '',
  blockNumber: 12_000_000
};

function mockOracle(response: object) {
  const fetchMock = vi.fn(async () => ({ json: async () => response }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function requestOf(fetchMock: ReturnType<typeof mockOracle>) {
  const [url, init] = fetchMock.mock.calls[0] as unknown as [string, any];
  return { url, body: JSON.parse(init.body) };
}

describe('oracle', () => {
  const oracleStrategy = createOracleStrategy();

  afterEach(() => {
    vi.unstubAllGlobals();
    provider.getBlock.mockClear();
    provider.call.mockClear();
  });

  it('should return type', () => {
    expect(oracleStrategy.type).toBe('oracle');
  });

  it('should encode the strategy canonically, as the oracle requires', () => {
    expect(toUtf8String(oracleParams)).toBe(
      '{"decimals":18,"id":"erc20-balance-of","network":"11155111","params":{"address":"0x0","symbol":"TKN"}}'
    );
    expect(canonicalize({ b: 1, a: { d: [3, { f: 1, e: 2 }], c: 'x' } })).toBe(
      '{"a":{"c":"x","d":[3,{"e":2,"f":1}]},"b":1}'
    );
  });

  it('should drop undefined values like JSON does', () => {
    expect(
      canonicalize({ b: undefined, a: [1, undefined], c: { d: undefined } })
    ).toBe('{"a":[1,null],"c":{}}');
  });

  it.each([
    ['no id', { network: '11155111', decimals: 18, params: {} }],
    ['no decimals', { id: 'eth-balance', network: '11155111', params: {} }],
    [
      'fractional decimals',
      { id: 'eth-balance', network: '11155111', decimals: 1.5, params: {} }
    ],
    [
      'a numeric network',
      { id: 'eth-balance', network: 11155111, decimals: 18, params: {} }
    ],
    [
      'array params',
      { id: 'eth-balance', network: '11155111', decimals: 18, params: [] }
    ]
  ])('should refuse to encode a strategy with %s', (_, strategy) => {
    expect(() => encodeOracleParams(ORACLE, strategy as any)).toThrow(
      'Invalid oracle strategy'
    );
  });

  it('should send the signed raw voting power at the chosen block when proposing', async () => {
    const fetchMock = mockOracle({
      result: { vp: '1514415861332052753', signature: '0x1234' }
    });

    const userParams = await oracleStrategy.getParams(
      'propose',
      { index: 0, address: STRATEGY, params },
      VOTER,
      null,
      proposeData,
      clientConfig
    );

    expect(
      defaultAbiCoder.decode(['uint256', 'bytes'], userParams).map(String)
    ).toEqual(['1514415861332052753', '0x1234']);
    const { url, body } = requestOf(fetchMock);
    expect(url).toBe(DEFAULT_ORACLE_URL);
    expect(body).toEqual({
      jsonrpc: '2.0',
      method: 'get_signed_vp',
      params: {
        address: VOTER,
        network: '11155111',
        snapshot: 12_000_000,
        params: oracleParams,
        strategy: STRATEGY
      },
      id: null
    });
  });

  it('should refuse to propose at the current block, which cannot be signed in advance', async () => {
    const fetchMock = mockOracle({});

    await expect(
      oracleStrategy.getParams(
        'propose',
        { index: 0, address: STRATEGY, params },
        VOTER,
        null,
        { ...proposeData, blockNumber: 0 },
        clientConfig
      )
    ).rejects.toThrow('Oracle voting power needs a past block');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('should use a custom oracle URL from the metadata', async () => {
    const fetchMock = mockOracle({ result: { vp: '1', signature: '0x' } });

    await oracleStrategy.getParams(
      'propose',
      { index: 0, address: STRATEGY, params },
      VOTER,
      { url: 'https://oracle.example.com/rpc' },
      proposeData,
      clientConfig
    );

    expect(requestOf(fetchMock).url).toBe('https://oracle.example.com/rpc');
  });

  it.each([{}, { url: null }, { payload: '' }])(
    "should use Snapshot's oracle when the metadata sets no URL: %p",
    async metadata => {
      const fetchMock = mockOracle({ result: { vp: '1', signature: '0x' } });

      await oracleStrategy.getParams(
        'propose',
        { index: 0, address: STRATEGY, params },
        VOTER,
        metadata,
        proposeData,
        clientConfig
      );

      expect(requestOf(fetchMock).url).toBe(DEFAULT_ORACLE_URL);
    }
  );

  it.each([
    'javascript:alert(1)',
    'file:///etc/passwd',
    'ipfs://bafy',
    'htps://typo.example.com',
    '',
    42
  ])(
    'should refuse a URL that is not http, instead of asking another oracle: %p',
    async url => {
      const fetchMock = mockOracle({ result: { vp: '1', signature: '0x' } });
      const strategyConfig = { index: 0, address: STRATEGY, params };

      await expect(
        oracleStrategy.getParams(
          'propose',
          strategyConfig,
          VOTER,
          { url },
          proposeData,
          clientConfig
        )
      ).rejects.toMatchObject({
        message: 'Invalid oracle URL',
        details: 'UNAVAILABLE',
        source: 'oracle'
      });
      await expect(
        oracleStrategy.getVotingPower(
          STRATEGY,
          VOTER,
          { url },
          12_000_000,
          params,
          provider
        )
      ).rejects.toMatchObject({ details: 'UNAVAILABLE', source: 'oracle' });
      expect(fetchMock).not.toHaveBeenCalled();
    }
  );

  it.each([
    [
      'voting power that is not final yet',
      { error: { data: 'voting power is not final yet' } },
      'NOT_READY_YET'
    ],
    [
      'any other oracle error',
      { error: { data: 'strategy whitelist has no exact voting power' } },
      'UNAVAILABLE'
    ],
    ['an empty response', {}, 'UNAVAILABLE']
  ])('should report %s', async (_, response, details) => {
    mockOracle(response);

    const promise = oracleStrategy.getParams(
      'propose',
      { index: 0, address: STRATEGY, params },
      VOTER,
      null,
      proposeData,
      clientConfig
    );

    await expect(promise).rejects.toBeInstanceOf(VotingPowerDetailsError);
    await expect(promise).rejects.toMatchObject({ details, source: 'oracle' });
  });

  it('should report an unreachable oracle', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('fetch failed');
      })
    );

    await expect(
      oracleStrategy.getParams(
        'propose',
        { index: 0, address: STRATEGY, params },
        VOTER,
        null,
        proposeData,
        clientConfig
      )
    ).rejects.toMatchObject({ details: 'UNAVAILABLE' });
  });

  it.each([
    ['no JSON body', null],
    [
      'a voting power that is not a number',
      { result: { vp: '1e18', signature: '0x' } }
    ],
    [
      'a voting power above uint256',
      { result: { vp: (2n ** 256n).toString(), signature: '0x' } }
    ],
    ['a signature that is not hex', { result: { vp: '1', signature: 'zz' } }]
  ])(
    'should report a response with %s instead of dropping the strategy',
    async (_, response) => {
      mockOracle(response as object);

      await expect(
        oracleStrategy.getParams(
          'propose',
          { index: 0, address: STRATEGY, params },
          VOTER,
          null,
          proposeData,
          clientConfig
        )
      ).rejects.toMatchObject({ details: 'UNAVAILABLE', source: 'oracle' });
    }
  );

  it('should report a vote whose proposal cannot be read', async () => {
    const fetchMock = mockOracle({ result: { vp: '1', signature: '0x' } });

    await expect(
      oracleStrategy.getParams(
        'vote',
        { index: 0, address: STRATEGY, params },
        VOTER,
        null,
        { ...proposeData, proposal: 1, choice: 1 },
        {
          ...clientConfig,
          provider: new StaticJsonRpcProvider('http://127.0.0.1:9', 11155111)
        }
      )
    ).rejects.toMatchObject({ details: 'UNAVAILABLE', source: 'oracle' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('should give up on a slow oracle', async () => {
    const fetchMock = mockOracle({ result: { vp: '1', signature: '0x' } });

    await oracleStrategy.getParams(
      'propose',
      { index: 0, address: STRATEGY, params },
      VOTER,
      null,
      proposeData,
      clientConfig
    );

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, any];
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('should show the exact value the oracle signs', async () => {
    const fetchMock = mockOracle({
      result: { vp: '1514415861332052753', signature: '0x1234' }
    });

    const vp = await oracleStrategy.getVotingPower(
      STRATEGY,
      VOTER,
      null,
      12_000_000,
      params,
      provider
    );

    expect(vp).toBe(1_514_415_861_332_052_753n);
    expect(requestOf(fetchMock).body.params).toEqual({
      address: VOTER,
      network: '11155111',
      snapshot: 12_000_000,
      params: oracleParams,
      strategy: STRATEGY
    });
    expect(provider.getBlock).not.toHaveBeenCalled();
    // Counted by the strategy, with the oracle signature
    const [{ to, data }] = provider.call.mock.calls[0];
    expect(to).toBe(STRATEGY);
    expect(
      strategyInterface.decodeFunctionData('getVotingPower', data).map(String)
    ).toEqual([
      '12000000',
      VOTER,
      params,
      defaultAbiCoder.encode(
        ['uint256', 'bytes'],
        ['1514415861332052753', '0x1234']
      )
    ]);
  });

  it('should not show voting power the strategy refuses to count', async () => {
    mockOracle({ result: { vp: '1', signature: '0x1234' } });
    provider.call.mockRejectedValueOnce(
      Object.assign(new Error('call revert exception'), {
        code: 'CALL_EXCEPTION'
      })
    );

    await expect(
      oracleStrategy.getVotingPower(
        STRATEGY,
        VOTER,
        null,
        12_000_000,
        params,
        provider
      )
    ).rejects.toThrow('call revert exception');
  });

  it('should read the current voting power at the safe head', async () => {
    const fetchMock = mockOracle({ result: { vp: '1', signature: '0x' } });

    await oracleStrategy.getVotingPower(
      STRATEGY,
      VOTER,
      null,
      null,
      params,
      provider
    );

    expect(provider.getBlock).toHaveBeenCalledWith('safe');
    expect(requestOf(fetchMock).body.params.snapshot).toBe(SAFE_HEAD);
  });
});
