import {
  createSafeSnapExecution,
  SafeSnapExecutionData
} from '@/helpers/safesnap/transactions';
import { compareAddresses } from '@/helpers/utils';
import { Proposal } from '@/types';
import { ExecutionInfo } from '../types';
import { ReadOnlyExecutionPlugin } from './api/types';

// Can hold shapes the editor never produces: UMA modules, multiple batches, or
// a legacy top-level transaction list with no module address at all.
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

// Every comparison below pairs the chain with the address: the same module can
// be deployed at the same address on several chains. A safe with no network
// runs on the space's chain, matching helpers/safesnap/strategies.ts.
function getSafeChainId(
  safe: SafeSnapPlugin['safes'][number],
  spaceChainId?: string
) {
  return Number(safe.network || spaceChainId || 1);
}

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

  // Rebuilding collapses batches into one, so an untouched safe keeps its
  // original entry.
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

  // The read path exposes at most one execution type per proposal, so a
  // safeSnap module on an oSnap proposal never reaches `executions`. Empty
  // transactions there mean "unknown", not "cleared by the author".
  function wasExposedOnRead(chainId: number, address: string) {
    return !!findOriginalExecution(chainId, address);
  }

  const readOnlyExecutionSafes = [] as ReadOnlyExecutionPlugin['safes'];
  const rebuiltSafes = [] as SafeSnapPlugin['safes'];
  // Includes modules left empty — an emptied one must not be carried over
  // below, or clearing an execution would leave the original in place.
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

  // Safes the editor cannot rebuild (UMA, legacy `txs`, modules dropped from
  // the config) never reach `executions`; without this an unrelated edit
  // deletes them. Rebuilt safes reclaim their slot, so editing does not
  // reorder.
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
