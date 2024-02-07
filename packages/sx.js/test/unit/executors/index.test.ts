import { getExecutionData } from '../../../src/executors';

describe('getExecutionData', () => {
  it('should create vanilla execution data', () => {
    const address = '0x040de235a2b53e921d37c2ea2b160750ca2e94f01d709f78f870963559de8fbe';

    const data = getExecutionData('SimpleQuorumVanilla', address);

    expect(data).toEqual({
      executor: address,
      executionParams: []
    });
  });

  it('should create ethRelayer execution data', () => {
    const address = '0x21dda40770f4317582251cffd5a0202d6b223dc167e5c8db25dc887d11eba81';
    const transactions = [
      {
        to: '0x2842c82E20ab600F443646e1BC8550B44a513D82',
        value: '0x0',
        data: '0x',
        operation: 0,
        nonce: 0,
        salt: 1n
      }
    ];

    const data = getExecutionData('EthRelayer', address, {
      transactions,
      destination: '0x196F0548E3140D2C7f6532a206dd54FbC12232a4'
    });

    expect(data).toEqual({
      executor: address,
      executionParams: [
        '0x196F0548E3140D2C7f6532a206dd54FbC12232a4',
        '0xb2ccadd39e92436dafecf5babd1d3470',
        '0xec694cb630bd85f58df3c0d4f11d3d72'
      ]
    });
  });

  it('should throw if inputs are missing', () => {
    const address = '0x21dda40770f4317582251cffd5a0202d6b223dc167e5c8db25dc887d11eba81';

    expect(() => getExecutionData('EthRelayer', address)).toThrowError(
      'Not enough data to create execution for executor 0x21dda40770f4317582251cffd5a0202d6b223dc167e5c8db25dc887d11eba81'
    );
  });
});
