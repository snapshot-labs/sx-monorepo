import {
  createSafeSnapExecution,
  SafeSnapExecutionData
} from '@/helpers/safesnap/transactions';
import { compareAddresses } from '@/helpers/utils';
import { Proposal, Transaction } from '@/types';
import { ExecutionInfo } from '../types';

type ReadOnlyExecutionSafe = {
  safeName: string;
  safeAddress: string;
  chainId: number;
  transactions: Transaction[];
};

type ReadOnlyExecutionPlugin = {
  safes: ReadOnlyExecutionSafe[];
};

// Entry of an existing proposal's plugins.safeSnap. It can hold shapes the
// editor never produces: UMA modules, multiple batches, or a legacy top-level
// transaction list with no module address at all.
type SafeSnapOriginalSafe = {
  network?: string;
  realityAddress?: string;
  umaAddress?: string;
  txs?: unknown;
};

type SafeSnapPlugin = {
  safes: (SafeSnapExecutionData | SafeSnapOriginalSafe)[];
  valid: boolean;
};

type OffchainPlugins = {
  readOnlyExecution?: ReadOnlyExecutionPlugin;
  safeSnap?: SafeSnapPlugin;
} & Record<string, unknown>;

const SUPPORTED_PLUGINS = ['readOnlyExecution', 'safeSnap'];

function getSafeAddress(safe: SafeSnapPlugin['safes'][number]) {
  return safe.realityAddress || safe.umaAddress || '';
}

// A module address is not unique on its own: the same Zodiac module can be
// deployed at the same address on several chains, so every comparison below
// pairs it with the chain. A safe omitting its network runs on the space's own
// chain, matching how the module is resolved on the write path
// (helpers/safesnap/strategies.ts).
function getSafeChainId(
  safe: SafeSnapPlugin['safes'][number],
  spaceChainId?: string
) {
  return Number(safe.network || spaceChainId || 1);
}

// Rebuild the proposal's plugins from the editor's executions on create and
// update. The tricky part is update: the original proposal already carries a
// plugins.safeSnap the editor can only partially reconstruct, so it must be
// merged rather than overwritten.
export function getPlugins(
  executions: ExecutionInfo[] | null,
  originalProposal: Proposal | null
): OffchainPlugins {
  const plugins = {} as OffchainPlugins;

  if (originalProposal) {
    for (const [name, plugin] of Object.entries(originalProposal.plugins)) {
      if (!SUPPORTED_PLUGINS.includes(name)) {
        plugins[name] = plugin;
      }
    }
  }

  if (!executions) return plugins;

  const originalSafeSnap = originalProposal?.plugins.safeSnap as
    | { safes?: SafeSnapOriginalSafe[]; txs?: unknown }
    | undefined;
  const originalSafes: SafeSnapOriginalSafe[] =
    originalSafeSnap?.safes ??
    (originalSafeSnap?.txs ? [{ txs: originalSafeSnap.txs }] : []);
  const spaceChainId = originalProposal?.space.snapshot_chain_id;

  function findOriginalExecution(chainId: number, address: string) {
    return originalProposal?.executions.find(
      execution =>
        execution.strategyType === 'safeSnap' &&
        Number(execution.chainId) === chainId &&
        compareAddresses(execution.safeAddress, address)
    );
  }

  // Rebuilding an execution collapses its batches into one and forces every
  // transaction to a call, so a safe the author did not touch keeps its
  // original entry instead of being re-serialized.
  function getUnchangedSafe(info: ExecutionInfo) {
    const original = findOriginalExecution(info.chainId, info.strategyAddress);

    if (
      !original ||
      JSON.stringify(original.transactions) !==
        JSON.stringify(info.transactions)
    ) {
      return null;
    }

    return (
      originalSafes.find(
        safe =>
          getSafeChainId(safe, spaceChainId) === info.chainId &&
          compareAddresses(getSafeAddress(safe), info.strategyAddress)
      ) ?? null
    );
  }

  // The read path exposes at most one execution type per proposal (see
  // offchain/api/index.ts): a safeSnap module coexisting with an oSnap
  // plugin never reaches `originalProposal.executions`, so the editor can
  // offer it without ever seeding its real transactions. An empty
  // `info.transactions` for such a module means "unknown", not "the author
  // cleared it" — only a module the read path actually exposed can be
  // treated as deliberately emptied.
  function wasExposedOnRead(chainId: number, address: string) {
    return !!findOriginalExecution(chainId, address);
  }

  const readOnlyExecutionSafes = [] as ReadOnlyExecutionPlugin['safes'];
  const rebuiltSafes = [] as SafeSnapPlugin['safes'];
  // Modules the editor offered, whether or not the author left any
  // transactions on them. An emptied one must not be carried over below,
  // or clearing an execution would leave the original in place.
  const editorSafeSnapModules = [] as { chainId: number; address: string }[];
  for (const info of executions) {
    if (info.strategyType === 'ReadOnlyExecution') {
      if (!info.transactions.length) continue;

      readOnlyExecutionSafes.push({
        safeName: info.treasuryName,
        safeAddress: info.strategyAddress,
        chainId: info.chainId,
        transactions: info.transactions
      });
    } else if (info.strategyType === 'safeSnap') {
      editorSafeSnapModules.push({
        chainId: info.chainId,
        address: info.strategyAddress
      });
      if (!info.transactions.length) continue;

      rebuiltSafes.push(
        getUnchangedSafe(info) ??
          createSafeSnapExecution(
            info.chainId,
            info.strategyAddress,
            info.transactions
          )
      );
    }
  }

  // Safes the editor cannot rebuild (UMA modules, legacy top-level `txs`,
  // modules dropped from the space config) never reach `executions`, so
  // without this an unrelated edit would delete them from the proposal.
  // Rebuilt safes take their original slot back, so editing one does not
  // reorder the array either.
  const pendingSafes = [...rebuiltSafes];
  const safes = [] as SafeSnapPlugin['safes'];
  for (const safe of originalSafes) {
    const address = getSafeAddress(safe);
    const chainId = getSafeChainId(safe, spaceChainId);
    const index = address
      ? pendingSafes.findIndex(
          rebuilt =>
            getSafeChainId(rebuilt, spaceChainId) === chainId &&
            compareAddresses(getSafeAddress(rebuilt), address)
        )
      : -1;

    if (index !== -1) {
      safes.push(pendingSafes.splice(index, 1)[0]);
      continue;
    }

    const clearedInEditor =
      !!address &&
      editorSafeSnapModules.some(
        offered =>
          offered.chainId === chainId &&
          compareAddresses(offered.address, address)
      ) &&
      wasExposedOnRead(chainId, address);
    if (!clearedInEditor) safes.push(safe);
  }
  safes.push(...pendingSafes);

  if (readOnlyExecutionSafes.length > 0) {
    plugins.readOnlyExecution = { safes: readOnlyExecutionSafes };
  }

  if (safes.length > 0) {
    plugins.safeSnap = { safes, valid: true };
  }

  return plugins;
}
