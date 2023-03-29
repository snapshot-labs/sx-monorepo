import createEthRelayerExecutor from '../../../src/executors/ethRelayer';

describe('ethRelayerExecutor', () => {
  const ethRelayerExecutor = createEthRelayerExecutor({
    destination: '0xa88f72e92cc519d617b684F8A78d3532E7bb61ca',
    chainId: 5
  });

  const address = '0x21dda40770f4317582251cffd5a0202d6b223dc167e5c8db25dc887d11eba81';
  const txs = [
    {
      to: '0x2842c82E20ab600F443646e1BC8550B44a513D82',
      value: '0x0',
      data: '0x',
      operation: 0,
      nonce: 0,
      salt: 1n
    }
  ];

  it('should create execution data', () => {
    const data = ethRelayerExecutor.getExecutionData(address, txs);

    expect(data).toEqual({
      executor: address,
      executionParams: [
        '0xa88f72e92cc519d617b684F8A78d3532E7bb61ca',
        '0xa54ae382d03ab474d9d2ddd47d3fac68',
        '0xb21b273bd32558c5eba5bb6576ac8592'
      ]
    });
  });
});
