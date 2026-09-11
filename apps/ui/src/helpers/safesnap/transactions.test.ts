import { describe, expect, it } from 'vitest';
import { Transaction } from '@/types';
import {
  createSafeSnapExecution,
  parseSafeSnapTransaction,
  SafeSnapTransaction,
  serializeSafeSnapTransaction
} from './transactions';

describe('parseSafeSnapTransaction', () => {
  it('should parse transferFunds with native token', () => {
    const tx: SafeSnapTransaction = {
      to: '0xeF8305E140ac520225DAf050e2f71d5fBcC543e7',
      data: '0x',
      value: '100000000000000000',
      type: 'transferFunds' as const,
      recipient: '0xeF8305E140ac520225DAf050e2f71d5fBcC543e7',
      amount: '100000000000000000',
      token: { name: 'Ethereum', decimals: 18, symbol: 'ETH', address: 'main' }
    };

    expect(parseSafeSnapTransaction(tx)).toMatchSnapshot();
  });

  it('should parse transferFunds with ERC20 token', () => {
    const tx: SafeSnapTransaction = {
      to: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      data: '0xa9059cbb',
      value: '0',
      type: 'transferFunds' as const,
      recipient: '0x556B14CbdA79A36dC33FcD461a04A5BCb5dC2A70',
      amount: '100000000',
      token: {
        name: 'USD Coin',
        decimals: 6,
        symbol: 'USDC',
        address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
      }
    };

    expect(parseSafeSnapTransaction(tx)).toMatchSnapshot();
  });

  it('should parse transferNFT', () => {
    const tx: SafeSnapTransaction = {
      to: '0x5A96CF3ace257Dfcc1fd3C037e548585124dc0C5',
      data: '0x42842e0e',
      value: '0',
      type: 'transferNFT' as const,
      recipient: '0x556B14CbdA79A36dC33FcD461a04A5BCb5dC2A70',
      collectable: {
        address: '0x5A96CF3ace257Dfcc1fd3C037e548585124dc0C5',
        id: '810',
        name: 'Weeedidit Palls #101',
        tokenName: 'Weee Did It Palz'
      }
    };

    expect(parseSafeSnapTransaction(tx)).toMatchSnapshot();
  });

  it('should parse contractInteraction', () => {
    const tx: SafeSnapTransaction = {
      to: '0x000000000000cd17345801aa8147b8D3950260FF',
      data: '0x0ae1b13d000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000004746573740000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000047465737400000000000000000000000000000000000000000000000000000000',
      value: '0',
      type: 'contractInteraction' as const,
      abi: '[{"inputs":[{"name":"content","type":"string"},{"name":"tag","type":"string"}],"name":"post","outputs":[],"stateMutability":"nonpayable","type":"function"}]'
    };

    expect(parseSafeSnapTransaction(tx)).toMatchSnapshot();
  });

  it('should fallback to raw for unknown type', () => {
    const tx: SafeSnapTransaction = {
      to: '0x556B14CbdA79A36dC33FcD461a04A5BCb5dC2A70',
      data: '0xdeadbeef',
      value: '1'
    };

    expect(parseSafeSnapTransaction(tx)).toMatchSnapshot();
  });

  it('should fallback to selector when ABI decoding fails', () => {
    const tx: SafeSnapTransaction = {
      to: '0x556B14CbdA79A36dC33FcD461a04A5BCb5dC2A70',
      data: '0xa9059cbb000000000000000000000000556b14cbda79a36dc33fcd461a04a5bcb5dc2a70',
      value: '0',
      type: 'contractInteraction' as const,
      abi: '[]'
    };

    const result = parseSafeSnapTransaction(tx);
    expect(result._type).toBe('contractCall');
    expect((result._form as { method: string }).method).toBe('0xa9059cbb');
  });
});

describe('serializeSafeSnapTransaction', () => {
  it('round-trips a token transfer through parseSafeSnapTransaction', () => {
    const tx: Transaction = {
      to: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      value: '0',
      data: '0xa9059cbb',
      salt: '',
      _type: 'sendToken',
      _form: {
        recipient: '0x556B14CbdA79A36dC33FcD461a04A5BCb5dC2A70',
        amount: '100000000',
        token: {
          name: 'USD Coin',
          decimals: 6,
          symbol: 'USDC',
          address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
        }
      }
    };

    const serialized = serializeSafeSnapTransaction(tx);
    expect(serialized.operation).toBe('0');
    expect(serialized.nonce).toBe('0');
    expect(parseSafeSnapTransaction(serialized)).toEqual(tx);
  });

  it('serializes a raw transaction without a type', () => {
    const tx: Transaction = {
      to: '0x556B14CbdA79A36dC33FcD461a04A5BCb5dC2A70',
      value: '1',
      data: '0xdeadbeef',
      salt: '',
      _type: 'raw',
      _form: { recipient: '0x556B14CbdA79A36dC33FcD461a04A5BCb5dC2A70' }
    };

    expect(serializeSafeSnapTransaction(tx).type).toBeUndefined();
  });

  it('round-trips an ERC-1155 NFT transfer, including quantity > 1', () => {
    const tx: Transaction = {
      to: '0xeF8305E140ac520225DAf050e2f71d5fBcC543e7',
      value: '0',
      data: '0xf242432a',
      salt: '',
      _type: 'sendNft',
      _form: {
        recipient: '0x556B14CbdA79A36dC33FcD461a04A5BCb5dC2A70',
        sender: '0xeF8305E140ac520225DAf050e2f71d5fBcC543e7',
        amount: '5',
        nft: {
          type: 'erc1155',
          address: '0xeF8305E140ac520225DAf050e2f71d5fBcC543e7',
          id: '1',
          name: 'Test NFT',
          collection: 'Test Collection'
        }
      }
    };

    const serialized = serializeSafeSnapTransaction(tx);
    expect(parseSafeSnapTransaction(serialized)).toEqual(tx);
  });

  it('preserves a delegatecall operation (e.g. a Fusion swap)', () => {
    const tx: Transaction = {
      to: '0x370De82413251A9d204DCEAB50dB2d7ec3Bd1769',
      value: '0',
      data: '0xdeadbeef',
      salt: '',
      operation: '1',
      _type: 'raw',
      _form: { recipient: '0x370De82413251A9d204DCEAB50dB2d7ec3Bd1769' }
    };

    const serialized = serializeSafeSnapTransaction(tx);
    expect(serialized.operation).toBe('1');
    expect(parseSafeSnapTransaction(serialized).operation).toBe('1');
    expect(
      parseSafeSnapTransaction({ ...serialized, operation: 1 as any }).operation
    ).toBe('1');
  });

  // v1 validates '0' | '1' (Plugin.validateTransaction) but its JSON import
  // stores any value verbatim, and its uint8 encoders disagree on some of
  // them (solidity.pack wraps -255 to 0x01); refuse rather than guess.
  it('accepts only a canonical 0/1 operation', () => {
    const stored = {
      to: '0x370De82413251A9d204DCEAB50dB2d7ec3Bd1769',
      value: '0',
      data: '0xdeadbeef'
    };
    const read = (operation: unknown) =>
      parseSafeSnapTransaction({ ...stored, operation } as any).operation;

    for (const operation of ['1', 1]) {
      expect(read(operation), JSON.stringify(operation)).toBe('1');
    }
    for (const operation of ['0', 0, undefined]) {
      expect(read(operation), JSON.stringify(operation)).toBeUndefined();
    }
    for (const operation of [
      '',
      null,
      true,
      [1],
      ['1'],
      '0x1',
      '0x01',
      '01',
      2,
      '2',
      -255
    ]) {
      expect(() => read(operation), JSON.stringify(operation)).toThrow();
    }
  });
});

describe('createSafeSnapExecution', () => {
  const raw = (value: string): Transaction => ({
    to: '0xeF8305E140ac520225DAf050e2f71d5fBcC543e7',
    value,
    data: '0x',
    salt: '',
    _type: 'raw',
    _form: { recipient: '0xeF8305E140ac520225DAf050e2f71d5fBcC543e7' }
  });

  it('stores a single batch SafeSnap recomputes the hash from', () => {
    const delegatecall = { ...raw('2'), operation: '1' as const };
    const execution = createSafeSnapExecution(
      1,
      '0x0d70332CEB7F3C94b061cda48327891E3449A9E1',
      [raw('1'), delegatecall]
    );

    expect(execution.network).toBe('1');
    expect(execution.realityAddress).toBe(
      '0x0d70332CEB7F3C94b061cda48327891E3449A9E1'
    );
    // One batch (single array) holding both transactions.
    expect(execution.txs).toHaveLength(1);
    expect(execution.txs[0]).toHaveLength(2);
    // The writer itself must carry the operation, not just the serializer.
    expect(execution.txs[0].map(tx => tx.operation)).toEqual(['0', '1']);
    // Read parser round-trips the stored batch.
    expect(execution.txs[0].map(parseSafeSnapTransaction)).toEqual([
      raw('1'),
      delegatecall
    ]);
  });

  it('blanks umaAddress so the space config cannot reroute it to UMA', () => {
    const execution = createSafeSnapExecution(
      1,
      '0x0d70332CEB7F3C94b061cda48327891E3449A9E1',
      [raw('1')]
    );

    // snapshot-v1 renders a proposal safe as `{ ...config.safes[i], ...safe }`
    // and then routes to UMA whenever the merged `umaAddress` is a live module.
    const merged = {
      ...{
        network: '1',
        umaAddress: '0x8aC054dC93Cd512e1f79F1B3cd732662980C2810',
        realityAddress: '0x0d70332CEB7F3C94b061cda48327891E3449A9E1'
      },
      ...execution
    };

    expect(merged.umaAddress).toBeNull();
  });
});
