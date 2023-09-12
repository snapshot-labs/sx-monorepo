import createEthRelayerExecutor from '../../../src/executors/ethRelayer';

describe('ethRelayerExecutor', () => {
  const ethRelayerExecutor = createEthRelayerExecutor({
    destination: '0xa88f72e92cc519d617b684F8A78d3532E7bb61ca'
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
        '0xb2ccadd39e92436dafecf5babd1d3470',
        '0xec694cb630bd85f58df3c0d4f11d3d72'
      ]
    });
  });
});
