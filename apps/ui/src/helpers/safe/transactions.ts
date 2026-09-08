import {
  Interface,
  JsonFragment,
  TransactionDescription
} from '@ethersproject/abi';
import { isAddress } from '@ethersproject/address';
import { BigNumber } from '@ethersproject/bignumber';
import { isBytesLike } from '@ethersproject/bytes';
import { formatUnits } from '@ethersproject/units';
import { ContractCallTransaction, RawTransaction } from '@snapshot-labs/sx';
import { abis } from '@/helpers/abis';
import { getABI } from '@/helpers/etherscan';
import {
  createRawTransaction,
  getContractCallFormArgs,
  parseTupleValue
} from '@/helpers/transactions';
import { abiToDefinition, getSalt } from '@/helpers/utils';
import { getValidator } from '@/helpers/validation';
import { Transaction } from '@/types';
import { validateChecksum } from './checksum';
import { BatchFile, BatchTransaction, ContractMethod } from './types';

// Only these messages reach the user; any other error gets a generic toast.
export class SafeImportError extends Error {}

const MAX_UINT256 = BigNumber.from(2).pow(256).sub(1);

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

  if (['true', '1'].includes(normalized)) return true;
  if (['false', '0'].includes(normalized)) return false;

  throw new Error('Invalid Boolean value');
}

function parseArg(type: string, value: string): any {
  if (type.startsWith('tuple')) return parseTupleValue(value);
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
  if (/^bytes\d*$/.test(type)) {
    // Safe encodes with web3-eth-abi, whose formatParam right-pads a short
    // bytesN to N bytes and then turns an odd digit count into 0x0…
    let hex = value.trim();
    const size = Number(type.slice(5));
    if (size) hex = hex.padEnd(2 + size * 2, '0');
    if (hex.length % 2) hex = `0x0${hex.slice(2)}`;

    return hex;
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

// ethers Result values are BigNumber objects (or nested arrays of them for
// tuples); without this, they'd leak into the form/exported file as
// `{"type":"BigNumber","hex":"0x..."}`.
function toPlain(value: any): any {
  if (BigNumber.isBigNumber(value)) return value.toString();
  if (Array.isArray(value)) return value.map(toPlain);

  return value;
}

function decodeWithAbi(
  tx: BatchTransaction,
  abi: any[]
): ContractCallTransaction | null {
  const iface = new Interface(abi);
  let parsed: TransactionDescription;
  try {
    parsed = iface.parseTransaction({ data: tx.data! });
  } catch {
    return null;
  }

  // parsed.functionFragment is a deepCopy (@ethersproject/properties) of the
  // interface's fragment; in ethers' ESM build (what Vite bundles) that copy
  // loses prototype methods like format(), so read the live fragment instead.
  const fragment = iface.getFunction(parsed.signature);

  // The Edit form re-encodes from the parsed args, but ethers' decoder
  // accepts trailing bytes (ERC-2771 sender, router referral tags) and
  // non-canonical encodings; keep any calldata it would not rebuild raw.
  const reencoded = iface.encodeFunctionData(fragment, parsed.args);
  if (reencoded.toLowerCase() !== tx.data!.toLowerCase()) return null;

  // The form only carries an amount for payable methods, so a nonpayable
  // ABI (e.g. the ERC20 fallback for an unverified contract) would zero
  // the file's value on edit+save.
  if (!fragment.payable && parseValue(tx.value) !== '0') {
    return null;
  }

  // Modal/Transaction.vue hides view methods and swaps the selection to the
  // first listed one, so an unchanged edit+save would encode a different call.
  if (fragment.stateMutability === 'view') return null;

  // Unnamed (ethers: null) or duplicate names collapse into one key below and
  // in createContractCallTransaction on edit+save; keep such calls raw.
  const names = fragment.inputs.map(input => input.name);
  if (names.some(name => !name) || new Set(names).size !== names.length) {
    return null;
  }

  // The Edit form validates args against abiToDefinition's schema; ajv
  // (strict) throws at compile for array types without a registered format
  // (string[], uint8[], bytes32[], bool[], fixed-size, nested), which leaves
  // the modal's Confirm disabled.
  try {
    getValidator(abiToDefinition(fragment));
  } catch {
    return null;
  }

  // - a fixed-size array gets no format (abiToDefinition keys on '[]'), but
  //   createContractCallTransaction leaves it a string, so re-save throws;
  // - an empty array collapses to the same '' the form uses for "no value".
  const hasUnsafeArray = fragment.inputs.some(
    (input, i) =>
      /\[\d+\]/.test(input.type) ||
      (input.type.endsWith('[]') && (parsed.args[i] as unknown[]).length === 0)
  );
  if (hasUnsafeArray) return null;

  // getContractCallFormArgs stringifies every scalar; restore decoded bool
  // args to real booleans for the Edit form's checkbox and ajv's
  // `type: 'boolean'` check.
  const args: Record<string, any> = getContractCallFormArgs({
    abi,
    method: parsed.signature,
    args: Object.fromEntries(
      fragment.inputs.map((input, i) => [input.name, toPlain(parsed.args[i])])
    )
  });
  fragment.inputs.forEach((input, i) => {
    if (input.type === 'bool') args[input.name] = parsed.args[i];
  });

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
      args,
      amount: fragment.payable ? formatUnits(parseValue(tx.value), 18) : ''
    }
  };
}

function toAbi(method: ContractMethod): JsonFragment[] {
  return [
    {
      name: method.name,
      type: 'function',
      stateMutability: method.payable ? 'payable' : 'nonpayable',
      inputs: method.inputs ?? [],
      outputs: []
    }
  ];
}

// Encodes a Safe contractMethod from its contractInputsValues strings; the
// export uses it to check that a typed form reproduces the stored calldata.
export function encodeContractMethod(
  method: ContractMethod,
  values: Record<string, string>
): string {
  return new Interface(toAbi(method)).encodeFunctionData(
    method.name,
    // Safe keys unnamed inputs by index (SolidityForm: name || index).
    (method.inputs ?? []).map((input, i) =>
      parseArg(input.type, values[input.name || i])
    )
  );
}

function fromContractMethod(
  tx: BatchTransaction,
  method: ContractMethod
): ContractCallTransaction | RawTransaction {
  // Safe's encoder refuses receive/fallback (NON_VALID_CONTRACT_METHODS) and
  // exports them with empty calldata; import as a plain transfer, keeping
  // whatever data the file carries.
  // https://github.com/safe-global/safe-react-apps/blob/118f25df89f781631386e6b279d812dfc837204a/apps/tx-builder/src/utils.ts#L206
  if (method.name === 'receive' || method.name === 'fallback') return toRaw(tx);

  // Safe's importer treats any truthy data, '0x' included, as custom hex and
  // ignores contractMethod; a '0x' here must stay a plain transfer.
  const data =
    tx.data || encodeContractMethod(method, tx.contractInputsValues ?? {});

  const txWithData = { ...tx, data };

  // Fall back with the calldata computed above: parseSafeTransaction's own
  // toRaw(tx) would drop it when the file omitted data.
  return decodeWithAbi(txWithData, toAbi(method)) || toRaw(txWithData);
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
  const transaction =
    (tx.contractMethod && fromContractMethod(tx, tx.contractMethod)) ||
    (await decode(tx, chainId)) ||
    toRaw(tx);

  return String(tx.operation) === '1'
    ? { ...transaction, operation: '1' }
    : transaction;
}

export async function parseSafeImportFile(
  content: string,
  chainId: string,
  { allowDelegatecall = false } = {}
): Promise<{ transactions: Transaction[]; warnings: string[] }> {
  const warnings: string[] = [];
  let file: Partial<BatchFile> | null;
  try {
    file = JSON.parse(content);
  } catch {
    throw new SafeImportError('This file is not valid JSON');
  }

  if (
    !file ||
    typeof file !== 'object' ||
    !Array.isArray(file.transactions) ||
    !file.transactions.length
  ) {
    throw new SafeImportError('No transactions found in file');
  }

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
    if (!tx || typeof tx !== 'object') {
      throw new SafeImportError(`Transaction ${i + 1} is malformed`);
    }
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
    if (
      typeof value !== 'string' ||
      !/^\d*$/.test(value) ||
      (value !== '' && BigNumber.from(value).gt(MAX_UINT256))
    ) {
      throw new SafeImportError(`Transaction ${i + 1} has an invalid value`);
    }
    // Strict equality on purpose: String([1]) === '1' would let an array through.
    const operation = (tx as { operation?: unknown }).operation;
    const validOperations = [undefined, '', '0', '1', 0, 1];
    if (!validOperations.some(valid => valid === operation)) {
      throw new SafeImportError(
        `Transaction ${i + 1} has an invalid operation`
      );
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

  const delegatecallIndexes = transactions
    .map((tx, i) => (tx.operation === '1' ? i + 1 : null))
    .filter((i): i is number => i !== null);
  if (delegatecallIndexes.length > 0) {
    // SafeSnap is the only executor that honours operation 1: EVM and
    // Starknet strategies go through convertToMetaTransactions, which
    // hardcodes 0, and read-only executions never execute at all.
    if (!allowDelegatecall) {
      throw new SafeImportError(
        'This file contains a delegatecall transaction, which is only supported with SafeSnap execution'
      );
    }
    const plural = delegatecallIndexes.length > 1;
    warnings.push(
      `Transaction${plural ? 's' : ''} ${delegatecallIndexes.join(', ')} ${plural ? 'are' : 'is'} a delegatecall, which grants full control of the Safe. Only import this file if you trust its source`
    );
  }

  return { transactions, warnings };
}
