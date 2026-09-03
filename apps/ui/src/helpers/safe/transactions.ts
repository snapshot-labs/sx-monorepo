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
import {
  createRawTransaction,
  getContractCallFormArgs
} from '@/helpers/transactions';
import { getSalt } from '@/helpers/utils';
import { validateChecksum } from './checksum';
import { BatchFile, BatchTransaction, ContractMethod } from './types';

// Only these messages reach the user; any other error gets a generic toast.
export class SafeImportError extends Error {}

function parseValue(value?: string | null): string {
  return value ? BigNumber.from(value).toString() : '0';
}

// Accepts a JSON array, Safe's bracketed-but-unquoted list (`[0xabc, 0xdef]`)
// and the bare `a, b` this app exports (getContractCallFormArgs' join).
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

// Same spellings as the Safe Transaction Builder's parseBooleanValue
// (safe-global/safe-react-apps apps/tx-builder/src/utils.ts, MIT, 118f25df).
function parseBooleanValue(value: string): boolean {
  const normalized = value.trim().toLowerCase();

  if (['true', 'True', 'TRUE', '1'].some(s => s === normalized)) return true;
  if (['false', 'False', 'FALSE', '0'].some(s => s === normalized)) {
    return false;
  }

  throw new Error('Invalid Boolean value');
}

function parseArg(type: string, value: string): any {
  if (type.startsWith('tuple')) return JSON.parse(value);
  if (type.endsWith(']')) {
    // Safe writes string arrays as JSON (elements may contain commas).
    if (type.startsWith('string') && value.trim().startsWith('[')) {
      return JSON.parse(value);
    }

    // Keep numbers as strings: JSON.parse would round a uint256 above 2^53.
    const elementType = type.replace(/\[\d*\]$/, '');
    return splitArrayValue(value).map(v => parseArg(elementType, v));
  }
  if (type === 'bool') return parseBooleanValue(value);
  if (/^u?int\d*$/.test(type)) {
    const trimmed = value.replace(/["']/g, '').trim();
    if (!trimmed) throw new Error('Invalid empty integer value');

    return trimmed;
  }

  return value;
}

function toRaw(tx: BatchTransaction): RawTransaction {
  return createRawTransaction({
    to: tx.to,
    data: tx.data || '0x',
    value: parseValue(tx.value)
  });
}

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

  // Unnamed (ethers: null) or duplicate names collapse into one key below and
  // in createContractCallTransaction on edit+save; keep such calls raw.
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

function fromContractMethod(
  tx: BatchTransaction,
  method: ContractMethod
): ContractCallTransaction | RawTransaction {
  // Safe's own encoder refuses these (NON_VALID_CONTRACT_METHODS); they must be
  // called with empty calldata, so import as a plain transfer.
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
          // Safe keys unnamed inputs by index (SolidityForm: name || index).
          inputs.map((input, i) =>
            parseArg(
              input.type,
              (tx.contractInputsValues ?? {})[input.name || i]
            )
          )
        );

  const txWithData = { ...tx, data };

  // Fall back with the calldata computed above: parseSafeTransaction's own
  // toRaw(tx) would drop it when the file omitted data.
  return decodeWithAbi(txWithData, abi) || toRaw(txWithData);
}

async function decode(
  tx: BatchTransaction,
  chainId?: string
): Promise<ContractCallTransaction | null> {
  if (!chainId || !tx.data || tx.data === '0x') return null;

  const candidates: any[] = [abis.erc20, abis.erc721];
  try {
    candidates.unshift(await getABI(Number(chainId), tx.to));
  } catch {
    // No verified ABI (or an unresolved proxy like USDC); the standard token
    // ABIs below still cover common calls.
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
    // Safe writes chainId '' when unknown; that must not match any treasury,
    // so this stays strict rather than `file.chainId && ...`.
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
    // Safe's own importer only warns on a checksum mismatch.
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
    // Absent or '' falls back to defaults; other non-strings (false, 0) are
    // malformed, not transfers.
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
