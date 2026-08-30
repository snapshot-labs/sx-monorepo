import { describe, expect, it } from 'vitest';
import { getPlugins } from './plugins';
import { ExecutionInfo } from '../types';

const MODULE_A = '0xaaaa000000000000000000000000000000000001';
const MODULE_B = '0xbbbb000000000000000000000000000000000002';
const UMA = '0xcccc000000000000000000000000000000000003';

function tx(value: string) {
  return {
    to: '0xeF8305E140ac520225DAf050e2f71d5fBcC543e7',
    value,
    data: '0x',
    salt: '',
    _type: 'raw',
    _form: { recipient: '0xeF8305E140ac520225DAf050e2f71d5fBcC543e7' }
  } as any;
}

function execution(
  strategyAddress: string,
  chainId: number,
  transactions: any[],
  strategyType = 'safeSnap'
): ExecutionInfo {
  return {
    strategyType,
    strategyAddress,
    destinationAddress: '0x0',
    treasuryName: 'SafeSnap',
    chainId,
    transactions
  };
}

// A proposal carrying an existing plugins.safeSnap, plus the parsed
// executions the editor seeds from it (keyed the way the read path exposes
// them: safeAddress = module address).
function proposal(safes: any[], executions: any[] = []) {
  return {
    plugins: { safeSnap: { safes, valid: true } },
    executions: executions.map(e => ({
      strategyType: 'safeSnap',
      safeAddress: e.address,
      chainId: e.chainId,
      transactions: e.transactions
    }))
  } as any;
}

describe('getPlugins — create', () => {
  it('serializes a safeSnap execution into a single batch', () => {
    const plugins = getPlugins([execution(MODULE_A, 1, [tx('1')])], null);

    expect(plugins.safeSnap?.safes).toHaveLength(1);
    const safe = plugins.safeSnap!.safes[0] as any;
    expect(safe.realityAddress).toBe(MODULE_A);
    expect(safe.network).toBe('1');
    expect(safe.txs).toHaveLength(1); // one batch
    expect(safe.txs[0]).toHaveLength(1); // holding the one transaction
  });

  it('omits safeSnap when the execution has no transactions', () => {
    const plugins = getPlugins([execution(MODULE_A, 1, [])], null);

    expect(plugins.safeSnap).toBeUndefined();
  });

  it('preserves unsupported plugins from the original proposal', () => {
    const original = {
      plugins: { safeSnap: { safes: [] }, poll: { id: 42 } },
      executions: []
    } as any;

    const plugins = getPlugins([execution(MODULE_A, 1, [tx('1')])], original);

    expect((plugins as any).poll).toEqual({ id: 42 });
  });
});

describe('getPlugins — update', () => {
  it('reuses the original entry verbatim when transactions are unchanged', () => {
    // Original stored two batches; the read path flattens them, so the editor
    // holds a single flat list. An untouched edit must not collapse them.
    const stored = {
      network: '1',
      realityAddress: MODULE_A,
      txs: [[{ nonce: '0' }], [{ nonce: '1' }]]
    };
    const original = proposal(
      [stored],
      [{ address: MODULE_A, chainId: 1, transactions: [tx('1'), tx('2')] }]
    );

    const plugins = getPlugins(
      [execution(MODULE_A, 1, [tx('1'), tx('2')])],
      original
    );

    // Same object, both batches intact — not re-serialized into one.
    expect(plugins.safeSnap!.safes[0]).toBe(stored);
  });

  it('re-serializes when the transactions were edited', () => {
    const stored = {
      network: '1',
      realityAddress: MODULE_A,
      txs: [[{ nonce: '0' }], [{ nonce: '1' }]]
    };
    const original = proposal(
      [stored],
      [{ address: MODULE_A, chainId: 1, transactions: [tx('1'), tx('2')] }]
    );

    const plugins = getPlugins(
      [execution(MODULE_A, 1, [tx('1')])], // one transaction removed
      original
    );

    const safe = plugins.safeSnap!.safes[0] as any;
    expect(safe).not.toBe(stored);
    expect(safe.txs[0]).toHaveLength(1); // rebuilt as one batch
  });

  it('drops a safe the author cleared', () => {
    const stored = { network: '1', realityAddress: MODULE_A, txs: [[{}]] };
    const original = proposal(
      [stored],
      [{ address: MODULE_A, chainId: 1, transactions: [tx('1')] }]
    );

    // Editor offered the module but the author removed every transaction.
    const plugins = getPlugins([execution(MODULE_A, 1, [])], original);

    expect(plugins.safeSnap).toBeUndefined();
  });

  it('preserves a UMA safe the editor never offered', () => {
    const uma = { network: '1', umaAddress: UMA, txs: [[{}]] };
    const reality = { network: '1', realityAddress: MODULE_A, txs: [[{}]] };
    const original = proposal(
      [uma, reality],
      [{ address: MODULE_A, chainId: 1, transactions: [tx('1')] }]
    );

    const plugins = getPlugins([execution(MODULE_A, 1, [tx('9')])], original);

    // UMA entry carried over untouched, in its original slot.
    expect(plugins.safeSnap!.safes).toHaveLength(2);
    expect(plugins.safeSnap!.safes[0]).toBe(uma);
  });

  it('preserves a legacy top-level txs payload', () => {
    const original = {
      plugins: { safeSnap: { txs: [[{ nonce: '0' }]] } },
      executions: []
    } as any;

    const plugins = getPlugins([execution(MODULE_A, 1, [tx('1')])], original);

    // Legacy shape (no module address) survives alongside the new safe.
    expect(plugins.safeSnap!.safes).toHaveLength(2);
    expect((plugins.safeSnap!.safes[0] as any).txs).toEqual([[{ nonce: '0' }]]);
  });

  it('keeps rebuilt safes in their original configured order', () => {
    const a = { network: '1', realityAddress: MODULE_A, txs: [[{}]] };
    const b = { network: '1', realityAddress: MODULE_B, txs: [[{}]] };
    const original = proposal(
      [a, b],
      [
        { address: MODULE_A, chainId: 1, transactions: [tx('1')] },
        { address: MODULE_B, chainId: 1, transactions: [tx('2')] }
      ]
    );

    // Editor emits B first, then A; the output must still be [A, B].
    const plugins = getPlugins(
      [execution(MODULE_B, 1, [tx('2')]), execution(MODULE_A, 1, [tx('9')])],
      original
    );

    const addrs = plugins.safeSnap!.safes.map((s: any) => s.realityAddress);
    expect(addrs).toEqual([MODULE_A, MODULE_B]);
  });

  it('does not touch a same-address module on another chain', () => {
    // Same module address on chains 1 and 137; only chain 1 is edited.
    const onChain1 = { network: '1', realityAddress: MODULE_A, txs: [[{}]] };
    const onChain137 = {
      network: '137',
      realityAddress: MODULE_A,
      txs: [[{}]]
    };
    const original = proposal(
      [onChain1, onChain137],
      [{ address: MODULE_A, chainId: 1, transactions: [tx('1')] }]
    );

    const plugins = getPlugins([execution(MODULE_A, 1, [tx('9')])], original);

    // Chain-137 entry must survive untouched, not be replaced or dropped.
    expect(plugins.safeSnap!.safes).toHaveLength(2);
    expect(plugins.safeSnap!.safes).toContain(onChain137);
  });

  it('preserves a safe the read path never exposed (e.g. an oSnap-plugin proposal)', () => {
    const stored = { network: '1', realityAddress: MODULE_A, txs: [[{}]] };
    // The read path parses at most one execution type per proposal, so a
    // safeSnap module coexisting with an oSnap plugin never reaches
    // `executions` even though `plugins.safeSnap` still holds its data.
    const original = {
      plugins: { safeSnap: { safes: [stored], valid: true } },
      executions: []
    } as any;

    // Editor still offers the module (space config drives that, not the
    // read path), but never saw its real transactions, so it renders empty.
    const plugins = getPlugins([execution(MODULE_A, 1, [])], original);

    expect(plugins.safeSnap!.safes).toHaveLength(1);
    expect(plugins.safeSnap!.safes[0]).toBe(stored);
  });
});
