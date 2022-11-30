import { ethRelayerExecutor } from '../../../src/executors';

describe('ethRelayerExecutor', () => {
  const address = '0x790a2f60ac5a1743ebfad2a00b06d1c40866dc92eead76a7ede6c805bc29a4b';
  const txs = [
    {
      to: '0x2842c82E20ab600F443646e1BC8550B44a513D82',
      value: '0x0',
      data: '0x',
      operation: 0,
      nonce: 0
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
