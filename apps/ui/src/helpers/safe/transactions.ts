import {
  Interface,
  JsonFragment,
  TransactionDescription
} from '@ethersproject/abi';
import { isAddress } from '@ethersproject/address';
import { BigNumber } from '@ethersproject/bignumber';
import { isBytesLike } from '@ethersproject/bytes';
import { formatUnits } from '@ethersproject/units';
import {
  ContractCallTransaction,
  RawTransaction,
  Transaction
} from '@snapshot-labs/sx';
import { abis } from '@/helpers/abis';
import { getABI } from '@/helpers/etherscan';
import { getContractCallFormArgs } from '@/helpers/transactions';
import { getSalt } from '@/helpers/utils';
import { validateChecksum } from './checksum';
import { BatchFile, BatchTransaction, ContractMethod } from './types';

// Marks a message safe to show the user verbatim; anything else
// parseSafeImportFile throws (JSON syntax errors, ethers argument errors) is
// too technical to surface.
export class SafeImportError extends Error {}

function parseValue(value?: string | null): string {
  return value ? BigNumber.from(value).toString() : '0';
}

// Split a bracketed or bare comma-separated list into top-level elements,
// stripping wrapping quotes per element. Covers a JSON array, the Safe
// Transaction Builder's own bracketed-but-unquoted list
// (`[0xabc, 0xdef]`), and the bare comma-joined string this app exports
// (getContractCallFormArgs's `value.join(', ')`).
function splitArrayValue(value: string): string[] {
  const trimmed = value.trim();
  const body =
    trimmed.startsWith('[') && trimmed.endsWith(']')
      ? trimmed.slice(1, -1)
      : trimmed;

  if (!body.trim()) return [];

  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const char of body) {
    if (char === '[') depth++;
    else if (char === ']') depth--;

    if (char === ',' && depth === 0) {
      parts.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  parts.push(current);

  return parts.map(part => part.trim().replace(/^['"]|['"]$/g, ''));
}

// Spellings accepted by the Safe Transaction Builder's own parseBooleanValue
// (safe-global/safe-react-apps apps/tx-builder/src/utils.ts, MIT, commit
// 118f25df89f781631386e6b279d812dfc837204a); anything else is rejected there
// too, so it never reaches an exported file.
function parseBooleanValue(value: string): boolean {
  const normalized = value.trim().toLowerCase();

  if (['true', 'True', 'TRUE', '1'].some(s => s === normalized)) return true;
  if (['false', 'False', 'FALSE', '0'].some(s => s === normalized)) {
    return false;
  }

  throw new Error('Invalid Boolean value');
}

// Safe stores every input value as a string; coerce the ones ethers can't,
// following the same rules as the Transaction Builder's parseInputValue.
function parseArg(type: string, value: string): any {
  if (type.startsWith('tuple')) return JSON.parse(value);
  if (type.endsWith(']')) {
    // Strings may contain commas, so Safe writes string arrays as JSON; this
    // app's own export still writes the bare comma-joined form.
    if (type.startsWith('string') && value.trim().startsWith('[')) {
      return JSON.parse(value);
    }

    // Numbers are kept as strings so ethers can parse big ints (JSON.parse
    // would round a uint256 above 2^53 to a lossy float).
    const elementType = type.replace(/\[\d*\]$/, '');
    return splitArrayValue(value).map(v => parseArg(elementType, v));
  }
  if (type === 'bool') return parseBooleanValue(value);
  if (/^u?int\d*$/.test(type)) {
    // Safe accepts quoted and padded integers; strip like its parseIntValue.
    const trimmed = value.replace(/["']/g, '').trim();
    if (!trimmed) throw new Error('Invalid empty integer value');

    return trimmed;
  }

  return value;
}

function toRaw(tx: BatchTransaction): RawTransaction {
  return {
    _type: 'raw',
    to: tx.to,
    data: tx.data || '0x',
    value: parseValue(tx.value),
    salt: getSalt(),
    _form: { recipient: tx.to }
  };
}

// The single builder for every contract call: decode the calldata with an ABI,
// or return null when it doesn't match.
function decodeWithAbi(
  tx: BatchTransaction,
  abi: any[]
): ContractCallTransaction | null {
  let parsed: TransactionDescription;
  try {
    parsed = new Interface(abi).parseTransaction({ data: tx.data! });
  } catch {
    // Selector or arguments don't match this ABI.
    return null;
  }

  // Unnamed (ethers normalises name: '' to null) or duplicate-named
  // inputs collapse to one key once args are indexed by name below, and
  // by getContractCallFormArgs/createContractCallTransaction on edit+save
  // — bail out to the raw fallback instead of showing/re-encoding wrong
  // args.
  const names = parsed.functionFragment.inputs.map(input => input.name);
  if (names.some(name => !name) || new Set(names).size !== names.length) {
    return null;
  }

  return {
    _type: 'contractCall',
    to: tx.to,
    data: tx.data!,
    value: parseValue(tx.value),
    salt: getSalt(),
    _form: {
      abi,
      recipient: tx.to,
      method: parsed.signature,
      args: getContractCallFormArgs({
        abi,
        method: parsed.signature,
        args: Object.fromEntries(
          parsed.functionFragment.inputs.map((input, i) => [
            input.name,
            parsed.args[i]
          ])
        )
      }),
      amount: parsed.functionFragment.payable
        ? formatUnits(parseValue(tx.value), 18)
        : ''
    }
  };
}

// A Safe Transaction Builder transaction carries the method and inputs; build
// its ABI, encode the calldata when the file omits it, then decode uniformly.
function fromContractMethod(
  tx: BatchTransaction,
  method: ContractMethod
): ContractCallTransaction | RawTransaction {
  // Safe lists payable receive/fallback as selectable methods, but its own
  // encoder refuses to build calldata for them (they take no arguments and
  // must be called with empty data); import as a plain transfer so we don't
  // invent a selector that reverts on-chain. See NON_VALID_CONTRACT_METHODS in
  // https://github.com/safe-global/safe-react-apps/blob/118f25df89f781631386e6b279d812dfc837204a/apps/tx-builder/src/utils.ts#L206
  if (method.name === 'receive' || method.name === 'fallback') return toRaw(tx);

  const inputs = method.inputs ?? [];
  const abi: JsonFragment[] = [
    {
      name: method.name,
      type: 'function',
      stateMutability: method.payable ? 'payable' : 'nonpayable',
      inputs,
      outputs: []
    }
  ];

  const data =
    tx.data && tx.data !== '0x'
      ? tx.data
      : new Interface(abi).encodeFunctionData(
          method.name,
          inputs.map(input =>
            parseArg(input.type, (tx.contractInputsValues ?? {})[input.name])
          )
        );

  // decodeWithAbi can reject this freshly-built abi (e.g. unnamed/duplicate
  // inputs); fall back to raw with the data computed above so the
  // calldata (never present on tx itself when the file omits it) isn't
  // lost to the data-less fallback in parseSafeTransaction.
  return decodeWithAbi({ ...tx, data }, abi) || toRaw({ ...tx, data });
}

// Decode raw calldata by fetching the contract ABI (Etherscan, with proxy
// resolution), then standard token ABIs (covers proxies like USDC whose
// implementation can't be resolved).
async function decode(
  tx: BatchTransaction,
  chainId?: string
): Promise<ContractCallTransaction | null> {
  if (!chainId || !tx.data || tx.data === '0x') return null;

  const candidates: any[] = [abis.erc20, abis.erc721];
  try {
    candidates.unshift(await getABI(Number(chainId), tx.to));
  } catch {
    // No verified ABI; standard token ABIs still cover common calls.
  }

  for (const abi of candidates) {
    const decoded = decodeWithAbi(tx, abi);
    if (decoded) return decoded;
  }

  return null;
}

async function parseSafeTransaction(
  tx: BatchTransaction,
  chainId?: string
): Promise<Transaction> {
  return (
    (tx.contractMethod && fromContractMethod(tx, tx.contractMethod)) ||
    (await decode(tx, chainId)) ||
    toRaw(tx)
  );
}

// Parse a Safe Transaction Builder export into editor transactions.
export async function parseSafeImportFile(
  content: string,
  chainId?: string
): Promise<{ transactions: Transaction[]; warnings: string[] }> {
  const warnings: string[] = [];
  const file = JSON.parse(content) as Partial<BatchFile> | null;

  if (
    !file ||
    typeof file !== 'object' ||
    !Array.isArray(file.transactions) ||
    !file.transactions.length
  ) {
    throw new SafeImportError('No transactions found in file');
  }

  if (chainId) {
    // Safe writes chainId: chainInfo?.chainId || '' — an empty/missing value
    // must not be treated as a match, or a file with no chain info would
    // import into any treasury regardless of network.
    const fileChainId = file.chainId ? String(file.chainId) : null;
    if (fileChainId !== chainId) {
      throw new SafeImportError(
        fileChainId
          ? `This file is for chain ${fileChainId}, not ${chainId}`
          : `This file does not specify a chain; refusing to import into chain ${chainId}`
      );
    }
  }

  const expectedChecksum = file.meta?.checksum;
  if (
    expectedChecksum &&
    !validateChecksum(file as BatchFile, expectedChecksum)
  ) {
    // Same as Safe's own importer: warn, but still import, since the
    // checksum only detects edits made after export (and anyone editing the
    // file can recompute it).
    warnings.push(
      'This file was modified after it was exported (checksum mismatch)'
    );
  }

  file.transactions.forEach((tx, i) => {
    if (!isAddress(tx.to)) {
      throw new SafeImportError(
        `Transaction ${i + 1} has an invalid recipient address`
      );
    }
    // Only absent (null/undefined) or empty fields may fall back to defaults;
    // any other non-string (false, 0) is a malformed file, not a transfer.
    const data = tx.data ?? '';
    if (typeof data !== 'string' || (data !== '' && !isBytesLike(data))) {
      throw new SafeImportError(`Transaction ${i + 1} has invalid calldata`);
    }
    const value = tx.value ?? '';
    if (typeof value !== 'string' || !/^\d*$/.test(value)) {
      throw new SafeImportError(`Transaction ${i + 1} has an invalid value`);
    }
  });

  const transactions = await Promise.all(
    file.transactions.map((tx, i) =>
      parseSafeTransaction(tx, chainId).catch(err => {
        console.error(err);

        throw new SafeImportError(
          `Transaction ${i + 1} in this file could not be imported`
        );
      })
    )
  );

  return { transactions, warnings };
}
