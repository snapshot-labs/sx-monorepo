import { Interface, JsonFragment } from '@ethersproject/abi';
import { BigNumber } from '@ethersproject/bignumber';
import {
  ContractCallTransaction,
  RawTransaction,
  Transaction
} from '@snapshot-labs/sx';
import { getSalt } from '@/helpers/utils';
import { BatchFile, BatchTransaction, ContractMethod } from './types';

function parseValue(value?: string | null): string {
  return value ? BigNumber.from(value).toString() : '0';
}

// Safe stores every input value as a string; coerce the ones ethers can't.
function parseArg(type: string, value: string) {
  if (type.endsWith(']') || type.startsWith('tuple')) return JSON.parse(value);
  if (type === 'bool') return value === 'true';
  return value;
}

function toContractCall(
  tx: BatchTransaction,
  method: ContractMethod
): ContractCallTransaction {
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
  const signature = `${method.name}(${inputs.map(input => input.type).join(',')})`;
  const args = tx.contractInputsValues ?? {};

  // Safe exports often omit `data`; encode it from the method when missing.
  const data =
    tx.data && tx.data !== '0x'
      ? tx.data
      : new Interface(abi).encodeFunctionData(
          signature,
          inputs.map(input => parseArg(input.type, args[input.name]))
        );

  return {
    _type: 'contractCall',
    to: tx.to,
    data,
    value: parseValue(tx.value),
    salt: getSalt(),
    _form: {
      abi,
      recipient: tx.to,
      method: signature,
      args,
      amount: ''
    }
  };
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

function parseSafeTransaction(tx: BatchTransaction): Transaction {
  return tx.contractMethod ? toContractCall(tx, tx.contractMethod) : toRaw(tx);
}

// Parse a Safe Transaction Builder export into editor transactions.
export function parseSafeImportFile(
  content: string,
  chainId?: string
): Transaction[] {
  const file = JSON.parse(content) as Partial<BatchFile>;

  if (!Array.isArray(file.transactions) || !file.transactions.length) {
    throw new Error('No transactions found in file');
  }

  if (chainId && file.chainId && String(file.chainId) !== chainId) {
    throw new Error(`This file is for chain ${file.chainId}, not ${chainId}`);
  }

  return file.transactions.map(parseSafeTransaction);
}
