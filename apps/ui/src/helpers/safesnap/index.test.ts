import { Transaction } from '@snapshot-labs/sx';
import { describe, expect, it } from 'vitest';
import { createSafeSnapExecution } from './index';
import {
  parseSafeSnapTransaction,
  serializeSafeSnapTransaction
} from './transactions';

const MULTI_SEND_ADDRESS = '0xA238CBeb142c10Ef7Ad8442C6D1f9E89e07e7761';

describe('createSafeSnapExecution', () => {
  // Golden values taken from a real gnosis.eth proposal executed on mainnet
  // (Reality module 0x0d70..., single contractInteraction batch).
  it('computes the on-chain batch and safe hashes for a single transaction', () => {
    const tx: Transaction = {
      to: '0x4976fb03C32e5B8cfe2b6cCB31c09Ba78EBaBa41',
      value: '0',
      data: '0x10f13a8c77651e2c25d2b7b073d1068420770f96a43563e74df60e234b2433b2be66e29e000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000008736e617073686f740000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000035697066733a2f2f516d564a614e74645459644a4e553674704c374b42674c3741784348547572476359755259365a6f366e314c45530000000000000000000000',
      salt: '',
      _type: 'contractCall',
      _form: {
        abi: ['function setText(bytes32 node, string key, string value)'],
        recipient: '0x4976fb03C32e5B8cfe2b6cCB31c09Ba78EBaBa41',
        method: 'setText',
        args: []
      }
    };

    const execution = createSafeSnapExecution(
      1,
      '0x0d70332CEB7F3C94b061cda48327891E3449A9E1',
      [tx]
    );

    expect(execution.txs[0].hash).toBe(
      '0xe3e5c9f0ec34e0ddf8e82b8370e413075b3916584a4203e00222573097cc84ba'
    );
    expect(execution.hash).toBe(
      '0x7c2b220f29c9e17f1630ec8fd72d420c47c368f82d62e747c764f88e68227757'
    );
    expect(execution.txs[0].nonce).toBe(0);
    expect(execution.txs[0].mainTransaction.operation).toBe('0');
    expect(execution.multiSendAddress).toBe(MULTI_SEND_ADDRESS);
    expect(execution.network).toBe('1');
  });

  it('wraps a multi-transaction batch in a single MultiSend call', () => {
    const txs: Transaction[] = [
      {
        to: '0xeF8305E140ac520225DAf050e2f71d5fBcC543e7',
        value: '1000000000000000000',
        data: '0x',
        salt: '',
        _type: 'raw',
        _form: { recipient: '0xeF8305E140ac520225DAf050e2f71d5fBcC543e7' }
      },
      {
        to: '0xeF8305E140ac520225DAf050e2f71d5fBcC543e7',
        value: '2000000000000000000',
        data: '0x',
        salt: '',
        _type: 'raw',
        _form: { recipient: '0xeF8305E140ac520225DAf050e2f71d5fBcC543e7' }
      }
    ];

    const execution = createSafeSnapExecution(
      1,
      '0x0d70332CEB7F3C94b061cda48327891E3449A9E1',
      txs
    );

    // Still a single batch, with both transactions bundled via MultiSend.
    expect(execution.txs).toHaveLength(1);
    expect(execution.txs[0].transactions).toHaveLength(2);
    expect(execution.txs[0].mainTransaction.to).toBe(MULTI_SEND_ADDRESS);
    expect(execution.txs[0].mainTransaction.operation).toBe('1');
    expect(execution.txs[0].mainTransaction.data.startsWith('0x8d80ff0a')).toBe(
      true
    );
  });
});

describe('serializeSafeSnapTransaction', () => {
  it('round-trips through parseSafeSnapTransaction', () => {
    const transactions: Transaction[] = [
      {
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
      }
    ];

    for (const tx of transactions) {
      const serialized = serializeSafeSnapTransaction(tx);
      expect(serialized.operation).toBe('0');
      expect(serialized.nonce).toBe('0');
      // The parsed form matches the original editor transaction.
      expect(parseSafeSnapTransaction(serialized)).toEqual(tx);
    }
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
});
