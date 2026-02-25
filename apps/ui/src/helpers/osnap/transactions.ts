import { JsonFragment } from '@ethersproject/abi';
import {
  BaseTransaction,
  ContractCallTransaction,
  RawTransaction,
  SendNftTransaction,
  SendTokenTransaction,
  Transaction
} from '@snapshot-labs/sx';
import { ETH_CONTRACT } from '../constants';

export const transactionTypes = [
  'transferFunds',
  'transferNFT',
  'contractInteraction',
  'raw',
  'safeImport'
] as const;

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
      sender: '',
      amount: '1',
      nft: {
        type: '',
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
