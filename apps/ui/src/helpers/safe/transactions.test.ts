import { Interface } from '@ethersproject/abi';
import { BigNumber } from '@ethersproject/bignumber';
import { hexConcat, hexZeroPad } from '@ethersproject/bytes';
import { describe, expect, it, vi } from 'vitest';
import { getABI } from '@/helpers/etherscan';
import { parseSafeImportFile } from './transactions';
import { serializeSafeSnapTransaction } from '../safesnap/transactions';
import fusionSwapMultiSend from './__fixtures__/fusion-swap-multisend.json';
import fusionSwap from './__fixtures__/fusion-swap.json';

// Decoding fetches the contract ABI; stub it so the test stays offline.
vi.mock('@/helpers/etherscan', () => ({ getABI: vi.fn() }));

// Mirrors how Snapshot v1 (coerceConfig -> createMultiSendTx) re-encodes a
// stored batch into the MultiSend call that the Safe module executes.
function encodeMultiSend(
  txs: { to: string; value: string; data: string; operation?: string }[]
) {
  const packed = hexConcat(
    txs.map(tx => {
      const data = tx.data || '0x';
      const length = data === '0x' ? 0 : (data.length - 2) / 2;
      return hexConcat([
        hexZeroPad(BigNumber.from(tx.operation || '0').toHexString(), 1),
        hexZeroPad(tx.to, 20),
        hexZeroPad(BigNumber.from(tx.value || '0').toHexString(), 32),
        hexZeroPad(BigNumber.from(length).toHexString(), 32),
        data
      ]);
    })
  );
  return new Interface([
    'function multiSend(bytes transactions)'
  ]).encodeFunctionData('multiSend', [packed]);
}

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

describe('1inch Fusion swap import', () => {
  // Safe Transaction Builder file produced by the Fusion order builder.
  const content = JSON.stringify(fusionSwap);

  it('captures the delegatecall operation from the file', async () => {
    const transactions = await parseSafeImportFile(content);

    expect(transactions).toHaveLength(2);
    // approve -> call, buildAndSignOrder -> delegatecall.
    expect(transactions[0].operation).toBeUndefined();
    expect(transactions[1].operation).toBe('1');
  });

  it('serializes to the exact MultiSend batch the Fusion script produces', async () => {
    const batch = (await parseSafeImportFile(content)).map(
      serializeSafeSnapTransaction
    );

    expect(batch.map(tx => tx.operation)).toEqual(['0', '1']);
    expect(encodeMultiSend(batch).toLowerCase()).toBe(
      fusionSwapMultiSend.multiSend.toLowerCase()
    );
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
