import { Interface } from '@ethersproject/abi';
import { describe, expect, it, vi } from 'vitest';
import { getABI } from '@/helpers/etherscan';
import { parseSafeImportFile } from './transactions';

// Decoding fetches the contract ABI; stub it so the test stays offline.
vi.mock('@/helpers/etherscan', () => ({ getABI: vi.fn() }));

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
  it('keeps the calldata from the file when present', async () => {
    const data = new Interface(TRANSFER_ABI).encodeFunctionData('transfer', [
      '0x556B14CbdA79A36dC33FcD461a04A5BCb5dC2A70',
      '100'
    ]);

    const [tx] = await parseSafeImportFile(
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

  it('encodes the calldata when the file omits it', async () => {
    const expected = new Interface(TRANSFER_ABI).encodeFunctionData(
      'transfer',
      ['0x556B14CbdA79A36dC33FcD461a04A5BCb5dC2A70', '100']
    );

    const [tx] = await parseSafeImportFile(
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

  it('parses a native transfer as a raw transaction', async () => {
    const [tx] = await parseSafeImportFile(
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

  it('throws on an empty or invalid file', async () => {
    await expect(parseSafeImportFile(file([]))).rejects.toThrow();
    await expect(parseSafeImportFile('not json')).rejects.toThrow();
  });

  it('throws when the chain does not match', async () => {
    await expect(
      parseSafeImportFile(
        file([{ to: '0x', value: '0', data: '0x' }], '1'),
        '100'
      )
    ).rejects.toThrow(/chain/);
  });
});

describe('decoding imported transactions', () => {
  it('decodes raw calldata via the fetched contract ABI', async () => {
    vi.mocked(getABI).mockResolvedValueOnce(TRANSFER_ABI);

    const data = new Interface(TRANSFER_ABI).encodeFunctionData('transfer', [
      '0x556B14CbdA79A36dC33FcD461a04A5BCb5dC2A70',
      '100'
    ]);

    // No contractMethod in the file; a chainId enables the ABI lookup.
    const [tx] = await parseSafeImportFile(
      file([
        { to: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', value: '0', data }
      ]),
      '1'
    );

    expect(tx._type).toBe('contractCall');
    expect((tx._form as any).method).toBe('transfer(address,uint256)');
    expect((tx._form as any).args).toEqual({
      to: '0x556B14CbdA79A36dC33FcD461a04A5BCb5dC2A70',
      value: '100'
    });
    // Original calldata is preserved (we never re-encode).
    expect(tx.data).toBe(data);
  });

  it('falls back to a standard ERC20 ABI for unresolved proxies (e.g. USDC)', async () => {
    vi.mocked(getABI).mockRejectedValueOnce(new Error('not verified'));

    const data = new Interface([
      'function approve(address spender, uint256 amount)'
    ]).encodeFunctionData('approve', [
      '0x111111125421ca6dc452d289314280a0f8842a65',
      '100'
    ]);

    const [tx] = await parseSafeImportFile(
      file([
        { to: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', value: '0', data }
      ]),
      '1'
    );

    expect(tx._type).toBe('contractCall');
    expect((tx._form as any).method).toBe('approve(address,uint256)');
  });
});
