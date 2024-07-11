import {
  BaseTransaction,
  ContractCallTransaction,
  RawTransaction,
  SendNftTransaction,
  SendTokenTransaction,
  Transaction
} from '@/types';
import { ETH_CONTRACT } from './constants';

export const transactionTypes = [
  'transferFunds',
  'transferNFT',
  'contractInteraction',
  'raw',
  'safeImport'
] as const;

type OSnapBaseTransaction = Omit<BaseTransaction, 'salt'>;

type OSnapTransferFundsTransaction = OSnapBaseTransaction & {
  type: 'transferFunds';
  amount: string;
  recipient: string;
  token: {
    name: string;
    decimals: number;
    symbol: string;
    address: string;
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
  method: {
    name: string;
  };
  parameters: any[];
};

type OSnapRawTransaction = OSnapBaseTransaction & {
  type: 'raw';
};

type OSnapTransaction =
  | OSnapTransferFundsTransaction
  | OSnapTransferNFTTransaction
  | OSnapContractInteractionTransaction
  | OSnapRawTransaction;

function parseTransferFundsTransaction(
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
        address: transaction.token.address === 'main' ? ETH_CONTRACT : transaction.token.address
      }
    }
  };
}

function parseTransferNFTTransaction(transaction: OSnapTransferNFTTransaction): SendNftTransaction {
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

function parseContractInteractionTransaction(
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

function parseRawTransaction(transaction: OSnapRawTransaction): RawTransaction {
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

export function parseOSnapTransaction(transaction: OSnapTransaction): Transaction {
  switch (transaction.type) {
    case 'transferFunds':
      return parseTransferFundsTransaction(transaction);
    case 'transferNFT':
      return parseTransferNFTTransaction(transaction);
    case 'contractInteraction':
      return parseContractInteractionTransaction(transaction);
    case 'raw':
      return parseRawTransaction(transaction);
    default:
      throw new Error('Invalid transaction type');
  }
}
