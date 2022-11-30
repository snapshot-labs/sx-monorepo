import { getExecutionData } from '../../../src/executors';

describe('getExecutionData', () => {
  it('should create vanilla execution data', () => {
    const address = '0x70d94f64cfab000f8e26318f4413dfdaa1f19a3695e3222297edc62bbc936c7';

    const data = getExecutionData(address);

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

    const data = getExecutionData('1', { calls });

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
    const address = '0x790a2f60ac5a1743ebfad2a00b06d1c40866dc92eead76a7ede6c805bc29a4b';
    const transactions = [
      {
        to: '0x2842c82E20ab600F443646e1BC8550B44a513D82',
        value: '0x0',
        data: '0x',
        operation: 0,
        nonce: 0
      }
    ];

    const data = getExecutionData(address, { transactions });

    expect(data).toEqual({
      executor: address,
      executionParams: [
        '0xa88f72e92cc519d617b684F8A78d3532E7bb61ca',
        '0xa54ae382d03ab474d9d2ddd47d3fac68',
        '0xb21b273bd32558c5eba5bb6576ac8592'
      ]
    });
  });

  it('should throw if contract is unknown', () => {
    const address = '0x0000000000000000000000000000000000000000000000000000000000000000';

    expect(() => getExecutionData(address)).toThrowError(
      'Unknown executor 0x0000000000000000000000000000000000000000000000000000000000000000'
    );
  });

  it('should throw if inputs are missing', () => {
    const address = '0x790a2f60ac5a1743ebfad2a00b06d1c40866dc92eead76a7ede6c805bc29a4b';

    expect(() => getExecutionData(address)).toThrowError(
      'Not enough data to create execution for executor 0x790a2f60ac5a1743ebfad2a00b06d1c40866dc92eead76a7ede6c805bc29a4b'
    );
  });
});
