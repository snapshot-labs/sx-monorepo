import { FormatTypes, Interface, JsonFragment } from '@ethersproject/abi';
import {
  BaseTransaction,
  ContractCallTransaction,
  RawTransaction,
  SendNftTransaction,
  SendTokenTransaction,
  Transaction
} from '@/types';
import { ETH_CONTRACT } from '../constants';

export const transactionTypes = [
  'transferFunds',
  'transferNFT',
  'contractInteraction',
  'raw',
  'safeImport'
] as const;

export type OSnapPlugin = {
  safes: Safe[];
};

type Safe = {
  safeName: string;
  safeAddress: string;
  network: string;
  transactions: OSnapTransaction[];
  moduleAddress: string;
};

export type OptimisticGovernorTransaction = [
  to: string,
  operation: 0,
  value: string,
  data: string
];

type OSnapBaseTransaction = Omit<BaseTransaction, 'salt'> & {
  formatted: OptimisticGovernorTransaction;
  isValid?: boolean;
};

type OSnapTransferFundsTransaction = OSnapBaseTransaction & {
  type: 'transferFunds';
  amount: string;
  recipient: string;
  token: {
    name: string;
    decimals: number;
    symbol: string;
    logoUri: string;
    address: string;
    balance: string;
    verified: boolean;
    chainId: string;
  };
};

type OSnapTransferNFTTransaction = OSnapBaseTransaction & {
  type: 'transferNFT';
  recipient: string;
  collectable: {
    address: string;
    id: string;
    name: string;
    tokenName: string;
  };
};

type OSnapContractInteractionTransaction = OSnapBaseTransaction & {
  type: 'contractInteraction';
  abi: string;
  method: Required<JsonFragment>;
  parameters: string[];
};

type OSnapSafeImportTransaction = OSnapBaseTransaction & {
  type: 'safeImport';
  abi: string;
  method: Required<JsonFragment>;
  parameters: { [key: string]: string };
};

type OSnapRawTransaction = OSnapBaseTransaction & {
  type: 'raw';
};

type OSnapTransaction =
  | OSnapTransferFundsTransaction
  | OSnapTransferNFTTransaction
  | OSnapContractInteractionTransaction
  | OSnapSafeImportTransaction
  | OSnapRawTransaction;

function parseOSnapTransferFundsTransaction(
  transaction: OSnapTransferFundsTransaction
): SendTokenTransaction {
  return {
    to: transaction.to,
    data: transaction.data,
    value: transaction.value,
    salt: '',
    _type: 'sendToken',
    _form: {
      recipient: transaction.recipient,
      amount: transaction.amount,
      token: {
        name: transaction.token.name,
        decimals: transaction.token.decimals,
        symbol: transaction.token.symbol,
        address:
          transaction.token.address === 'main'
            ? ETH_CONTRACT
            : transaction.token.address
      }
    }
  };
}

function parseOSnapTransferNFTTransaction(
  transaction: OSnapTransferNFTTransaction
): SendNftTransaction {
  return {
    to: transaction.to,
    data: transaction.data,
    value: transaction.value,
    salt: '',
    _type: 'sendNft',
    _form: {
      recipient: transaction.recipient,
      amount: '1',
      nft: {
        address: transaction.collectable.address,
        id: transaction.collectable.id,
        name: transaction.collectable.name,
        collection: transaction.collectable.tokenName
      }
    }
  };
}

function parseOSnapContractInteractionTransaction(
  transaction: OSnapContractInteractionTransaction
): ContractCallTransaction {
  return {
    to: transaction.to,
    data: transaction.data,
    value: transaction.value,
    salt: '',
    _type: 'contractCall',
    _form: {
      recipient: transaction.to,
      method: transaction.method.name,
      args: transaction.parameters,
      abi: JSON.parse(transaction.abi)
    }
  };
}

function parseOSnapSafeImportTransaction(
  transaction: OSnapSafeImportTransaction
): ContractCallTransaction {
  return {
    to: transaction.to,
    data: transaction.data,
    value: transaction.value,
    salt: '',
    _type: 'contractCall',
    _form: {
      recipient: transaction.to,
      method: transaction.method.name,
      args: transaction.method.inputs.map(input =>
        input.name ? transaction.parameters[input.name] : null
      ),
      abi: JSON.parse(transaction.abi)
    }
  };
}

function parseOSnapRawTransaction(
  transaction: OSnapRawTransaction
): RawTransaction {
  return {
    to: transaction.to,
    data: transaction.data,
    value: transaction.value,
    salt: '',
    _type: 'raw',
    _form: {
      recipient: transaction.to
    }
  };
}

function parseSendTokenTransaction(
  transaction: SendTokenTransaction
): OSnapTransferFundsTransaction {
  return {
    to: transaction.to,
    data: transaction.data,
    value: transaction.value,
    formatted: [transaction.to, 0, transaction.value, transaction.data],
    isValid: true,
    type: 'transferFunds',
    amount: transaction._form.amount,
    recipient: transaction._form.recipient,
    token: {
      name: transaction._form.token.name,
      decimals: transaction._form.token.decimals,
      symbol: transaction._form.token.symbol,
      logoUri: '',
      address:
        transaction._form.token.address === ETH_CONTRACT
          ? 'main'
          : transaction._form.token.address,
      balance: '0',
      verified: false,
      chainId: ''
    }
  };
}

function parseSendNftTransaction(
  transaction: SendNftTransaction
): OSnapTransferNFTTransaction {
  return {
    to: transaction.to,
    data: transaction.data,
    value: transaction.value,
    formatted: [transaction.to, 0, transaction.value, transaction.data],
    isValid: true,
    type: 'transferNFT',
    recipient: transaction._form.recipient,
    collectable: {
      address: transaction._form.nft.address,
      id: transaction._form.nft.id,
      name: transaction._form.nft.name,
      tokenName: transaction._form.nft.collection || ''
    }
  };
}

function parseContractCallTransaction(
  transaction: ContractCallTransaction
): OSnapContractInteractionTransaction {
  const iface = new Interface(transaction._form.abi);
  const jsonAbi = iface.format(FormatTypes.json);
  if (Array.isArray(jsonAbi)) throw new Error('Invalid ABI');

  const rawMethodName = transaction._form.method.slice(
    0,
    transaction._form.method.indexOf('(')
  );

  const method = JSON.parse(jsonAbi).find(
    (fragment: JsonFragment) => fragment.name === rawMethodName
  );
  if (!method) throw new Error('Method not found in the ABI');

  return {
    to: transaction.to,
    data: transaction.data,
    value: transaction.value,
    formatted: [transaction.to, 0, transaction.value, transaction.data],
    isValid: true,
    type: 'contractInteraction',
    abi: jsonAbi,
    method: method as Required<JsonFragment>,
    parameters: method.inputs.map(input => transaction._form.args[input.name])
  };
}

function parseRawTransaction(transaction: RawTransaction): OSnapRawTransaction {
  return {
    to: transaction.to,
    data: transaction.data,
    value: transaction.value,
    formatted: [transaction.to, 0, transaction.value, transaction.data],
    isValid: true,
    type: 'raw'
  };
}

export function parseOSnapTransaction(
  transaction: OSnapTransaction
): Transaction {
  switch (transaction.type) {
    case 'transferFunds':
      return parseOSnapTransferFundsTransaction(transaction);
    case 'transferNFT':
      return parseOSnapTransferNFTTransaction(transaction);
    case 'contractInteraction':
      return parseOSnapContractInteractionTransaction(transaction);
    case 'safeImport':
      return parseOSnapSafeImportTransaction(transaction);
    case 'raw':
      return parseOSnapRawTransaction(transaction);
    default:
      throw new Error('Invalid transaction type');
  }
}

export function parseInternalTransaction(
  transaction: Transaction
): OSnapTransaction {
  switch (transaction._type) {
    case 'sendToken':
      return parseSendTokenTransaction(transaction);
    case 'sendNft':
      return parseSendNftTransaction(transaction);
    case 'contractCall':
      return parseContractCallTransaction(transaction);
    case 'raw':
      return parseRawTransaction(transaction);
    default:
      throw new Error('Invalid transaction type');
  }
}
