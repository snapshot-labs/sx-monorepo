import { Interface } from '@ethersproject/abi';
import { describe, expect, it } from 'vitest';
import { parseSafeImportFile } from './transactions';

const TRANSFER_ABI = [
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' }
    ],
    outputs: []
  }
];

function file(transactions: any[], chainId = '1') {
  return JSON.stringify({ version: '1.0', chainId, transactions });
}

describe('parseSafeImportFile', () => {
  it('keeps the calldata from the file when present', () => {
    const data = new Interface(TRANSFER_ABI).encodeFunctionData('transfer', [
      '0x556B14CbdA79A36dC33FcD461a04A5BCb5dC2A70',
      '100'
    ]);

    const [tx] = parseSafeImportFile(
      file([
        {
          to: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
          value: '0',
          data,
          contractMethod: {
            name: 'transfer',
            payable: false,
            inputs: [
              { name: 'to', type: 'address' },
              { name: 'value', type: 'uint256' }
            ]
          },
          contractInputsValues: {
            to: '0x556B14CbdA79A36dC33FcD461a04A5BCb5dC2A70',
            value: '100'
          }
        }
      ])
    );

    expect(tx._type).toBe('contractCall');
    expect(tx.to).toBe('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48');
    expect(tx.data).toBe(data);
    expect((tx._form as any).method).toBe('transfer(address,uint256)');
    expect((tx._form as any).args).toEqual({
      to: '0x556B14CbdA79A36dC33FcD461a04A5BCb5dC2A70',
      value: '100'
    });
  });

  it('encodes the calldata when the file omits it', () => {
    const expected = new Interface(TRANSFER_ABI).encodeFunctionData(
      'transfer',
      ['0x556B14CbdA79A36dC33FcD461a04A5BCb5dC2A70', '100']
    );

    const [tx] = parseSafeImportFile(
      file([
        {
          to: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
          value: '0',
          data: null,
          contractMethod: {
            name: 'transfer',
            payable: false,
            inputs: [
              { name: 'to', type: 'address' },
              { name: 'value', type: 'uint256' }
            ]
          },
          contractInputsValues: {
            to: '0x556B14CbdA79A36dC33FcD461a04A5BCb5dC2A70',
            value: '100'
          }
        }
      ])
    );

    expect(tx.data).toBe(expected);
  });

  it('parses a native transfer as a raw transaction', () => {
    const [tx] = parseSafeImportFile(
      file([
        {
          to: '0xeF8305E140ac520225DAf050e2f71d5fBcC543e7',
          value: '1000000000000000000',
          data: '0x',
          contractMethod: null,
          contractInputsValues: null
        }
      ])
    );

    expect(tx._type).toBe('raw');
    expect(tx.to).toBe('0xeF8305E140ac520225DAf050e2f71d5fBcC543e7');
    expect(tx.value).toBe('1000000000000000000');
    expect(tx.data).toBe('0x');
  });

  it('throws on an empty or invalid file', () => {
    expect(() => parseSafeImportFile(file([]))).toThrow();
    expect(() => parseSafeImportFile('not json')).toThrow();
  });

  it('throws when the chain does not match', () => {
    expect(() =>
      parseSafeImportFile(
        file([{ to: '0x', value: '0', data: '0x' }], '1'),
        '100'
      )
    ).toThrow(/chain/);
  });
});
