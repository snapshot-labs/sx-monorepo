import { getExecutionData } from '../../../src/executors';
import { defaultNetwork } from '../../../src/networks';

describe('getExecutionData', () => {
  it('should create vanilla execution data', () => {
    const address = '0x4ecc83848a519cc22b0d0ffb70e65ec8dde85d3d13439eff7145d4063cf6b4d';

    const data = getExecutionData(address, defaultNetwork);

    expect(data).toEqual({
      executor: address,
      executionParams: []
    });
  });

  it('should create starknet execution data', () => {
    const calls = [
      {
        contractAddress: '0x06AbD599AB530c5b3bc603111Bdd20d77890Db330402dC870Fc9866f50eD6d2A',
        entrypoint: 'transfer',
        calldata: ['0x01']
      }
    ];

    const data = getExecutionData('1', defaultNetwork, { calls });

    expect(data).toEqual({
      executor: '1',
      executionParams: [
        '0x5',
        '0x06AbD599AB530c5b3bc603111Bdd20d77890Db330402dC870Fc9866f50eD6d2A',
        '0x83afd3f4caedc6eebf44246fe54e38c95e3179a5ec9ea81740eca5b482d12e',
        '0x0',
        '0x1',
        '0x01'
      ]
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

    const data = getExecutionData(address, defaultNetwork, { transactions });

    expect(data).toEqual({
      executor: address,
      executionParams: [
        '0x196F0548E3140D2C7f6532a206dd54FbC12232a4',
        '0x4de14679d438e4cb657be1175542ba99',
        '0x395bb952697be0523cbdf6bc31276243'
      ]
    });
  });

  it('should throw if contract is unknown', () => {
    const address = '0x0000000000000000000000000000000000000000000000000000000000000000';

    expect(() => getExecutionData(address, defaultNetwork)).toThrowError(
      'Unknown executor 0x0000000000000000000000000000000000000000000000000000000000000000'
    );
  });

  it('should throw if inputs are missing', () => {
    const address = '0x21dda40770f4317582251cffd5a0202d6b223dc167e5c8db25dc887d11eba81';

    expect(() => getExecutionData(address, defaultNetwork)).toThrowError(
      'Not enough data to create execution for executor 0x21dda40770f4317582251cffd5a0202d6b223dc167e5c8db25dc887d11eba81'
    );
  });
});
