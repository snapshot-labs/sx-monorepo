import { describe, expect, it } from 'vitest';
import { ETH_CONTRACT } from './constants';
import {
  OptimisticGovernorTransaction,
  parseInternalTransaction,
  parseOSnapTransaction
} from './osnap';

describe('parseOSnapTransaction', () => {
  it('should parse oSnap transfer funds transaction', () => {
    const transaction = {
      to: '0x556B14CbdA79A36dC33FcD461a04A5BCb5dC2A70',
      data: '0x',
      type: 'transferFunds' as const,
      token: {
        name: 'Ether',
        symbol: 'ETH',
        address: 'main',
        balance: '0.379',
        chainId: '11155111',
        logoUri:
          'https://safe-transaction-assets.safe.global/chains/1/currency_logo.png',
        decimals: 18,
        verified: false
      },
      value: '1000000000000000',
      amount: '1000000000000000',
      isValid: true,
      formatted: [
        '0x556B14CbdA79A36dC33FcD461a04A5BCb5dC2A70',
        0,
        '1000000000000000',
        '0x'
      ] as OptimisticGovernorTransaction,
      recipient: '0x556B14CbdA79A36dC33FcD461a04A5BCb5dC2A70'
    };

    expect(parseOSnapTransaction(transaction)).toMatchSnapshot();
  });

  it('should parse oSnap transfer NFT transaction', () => {
    const transaction = {
      to: '0x5A96CF3ace257Dfcc1fd3C037e548585124dc0C5',
      data: '0x42842e0e0000000000000000000000008edfcc5f141ffc2b6892530d1fb21bbcdc74b455000000000000000000000000556b14cbda79a36dc33fcd461a04a5bcb5dc2a70000000000000000000000000000000000000000000000000000000000000032a',
      type: 'transferNFT' as const,
      value: '0',
      isValid: true,
      formatted: [
        '0x5A96CF3ace257Dfcc1fd3C037e548585124dc0C5',
        0,
        '0',
        '0x42842e0e0000000000000000000000008edfcc5f141ffc2b6892530d1fb21bbcdc74b455000000000000000000000000556b14cbda79a36dc33fcd461a04a5bcb5dc2a70000000000000000000000000000000000000000000000000000000000000032a'
      ] as OptimisticGovernorTransaction,
      recipient: '0x556B14CbdA79A36dC33FcD461a04A5BCb5dC2A70',
      collectable: {
        id: '810',
        uri: 'https://bafkreigtcra4mp2u5ppor2akc5mxjop6ag4o72ryugic63goqbxscpwygy.ipfs.nftstorage.link/',
        name: 'Weeedidit Palls #101',
        address: '0x5A96CF3ace257Dfcc1fd3C037e548585124dc0C5',
        logoUri:
          'https://safe-transaction-assets.safe.global/tokens/logos/0x5A96CF3ace257Dfcc1fd3C037e548585124dc0C5.png',
        imageUri:
          'https://nft-delivery.infura-ipfs.io/ipfs/QmQiJyvrV8sETi8HtV89yaJit5or7ZaMUo8pFsCJXMM8RL/101.png',
        metadata: {
          name: 'Weeedidit Palls #101',
          image:
            'https://nft-delivery.infura-ipfs.io/ipfs/QmQiJyvrV8sETi8HtV89yaJit5or7ZaMUo8pFsCJXMM8RL/101.png',
          attributes: [],
          description:
            'Step into a surreal universe of vibrant colors and mind-bending shapes. Explore a world where imagination reigns and creativity knows no bounds.'
        },
        tokenName: 'Weee Did It Palz',
        description:
          'Step into a surreal universe of vibrant colors and mind-bending shapes. Explore a world where imagination reigns and creativity knows no bounds.',
        tokenSymbol: 'WDIT'
      }
    };

    expect(parseOSnapTransaction(transaction)).toMatchSnapshot();
  });

  it('should parse oSnap contract interaction transaction', () => {
    const transaction = {
      to: '0x000000000000cd17345801aa8147b8D3950260FF',
      abi: '[{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"string","name":"content","type":"string"},{"indexed":true,"internalType":"string","name":"tag","type":"string"}],"name":"NewPost","type":"event"},{"inputs":[{"internalType":"string","name":"content","type":"string"},{"internalType":"string","name":"tag","type":"string"}],"name":"post","outputs":[],"stateMutability":"nonpayable","type":"function"}]',
      data: '0x0ae1b13d000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000004746573740000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000047465737400000000000000000000000000000000000000000000000000000000',
      type: 'contractInteraction' as const,
      value: '0',
      method: {
        gas: null,
        name: 'post',
        type: 'function',
        inputs: [
          {
            name: 'content',
            type: 'string',
            indexed: null,
            baseType: 'string',
            components: null,
            arrayLength: null,
            _isParamType: true,
            arrayChildren: null
          },
          {
            name: 'tag',
            type: 'string',
            indexed: null,
            baseType: 'string',
            components: null,
            arrayLength: null,
            _isParamType: true,
            arrayChildren: null
          }
        ],
        outputs: [],
        payable: false,
        constant: false,
        _isFragment: true,
        stateMutability: 'nonpayable'
      } as any,
      isValid: true,
      formatted: [
        '0x000000000000cd17345801aa8147b8D3950260FF',
        0,
        '0',
        '0x0ae1b13d000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000004746573740000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000047465737400000000000000000000000000000000000000000000000000000000'
      ] as OptimisticGovernorTransaction,
      parameters: ['test', 'test']
    };

    expect(parseOSnapTransaction(transaction)).toMatchSnapshot();
  });

  it('should parse oSnap safeImport transaction', () => {
    const transaction = {
      to: '0x4F604735c1cF31399C6E711D5962b2B3E0225AD3',
      abi: '[{"type":"function","name":"transfer","constant":false,"inputs":[{"name":"to","type":"address","indexed":null,"components":null,"arrayLength":null,"arrayChildren":null,"baseType":"address","_isParamType":true},{"name":"amount","type":"uint256","indexed":null,"components":null,"arrayLength":null,"arrayChildren":null,"baseType":"uint256","_isParamType":true}],"outputs":[],"payable":false,"stateMutability":"nonpayable","gas":null,"_isFragment":true}]',
      data: '0xa9059cbb000000000000000000000000fe1552da65facaac5b50b73ceda4c993e16d46940000000000000000000000000000000000000000000000000de0b6b3a7640000',
      type: 'safeImport' as const,
      value: '0',
      method: {
        gas: null,
        name: 'transfer',
        type: 'function',
        inputs: [
          {
            name: 'to',
            type: 'address',
            indexed: null,
            baseType: 'address',
            components: null,
            arrayLength: null,
            _isParamType: true,
            arrayChildren: null
          },
          {
            name: 'amount',
            type: 'uint256',
            indexed: null,
            baseType: 'uint256',
            components: null,
            arrayLength: null,
            _isParamType: true,
            arrayChildren: null
          }
        ],
        outputs: [],
        payable: false,
        constant: false,
        _isFragment: true,
        stateMutability: 'nonpayable'
      } as any,
      isValid: true,
      formatted: [
        '0x4F604735c1cF31399C6E711D5962b2B3E0225AD3',
        0,
        '0',
        '0xa9059cbb000000000000000000000000fe1552da65facaac5b50b73ceda4c993e16d46940000000000000000000000000000000000000000000000000de0b6b3a7640000'
      ] as OptimisticGovernorTransaction,
      parameters: {
        to: '0xfE1552DA65FAcAaC5B50b73CEDa4C993e16d4694',
        amount: '1000000000000000000'
      }
    };

    expect(parseOSnapTransaction(transaction)).toMatchSnapshot();
  });

  it('should parse oSnap raw transaction', () => {
    const transaction = {
      to: '0x556B14CbdA79A36dC33FcD461a04A5BCb5dC2A70',
      data: '0x',
      type: 'raw' as const,
      value: '1',
      isValid: true,
      formatted: [
        '0x556B14CbdA79A36dC33FcD461a04A5BCb5dC2A70',
        0,
        '1',
        '0x'
      ] as OptimisticGovernorTransaction
    };

    expect(parseOSnapTransaction(transaction)).toMatchSnapshot();
  });

  it('should throw on unknown transaction', () => {
    const transaction = {
      type: 'unknown'
    };

    expect(() => parseOSnapTransaction(transaction as any)).toThrowError(
      'Invalid transaction type'
    );
  });
});

describe('parseInternalTransaction', () => {
  it('should parse transfer token transaction', () => {
    const transaction = {
      _type: 'sendToken' as const,
      to: '0x556B14CbdA79A36dC33FcD461a04A5BCb5dC2A70',
      data: '0x',
      value: '1',
      salt: '',
      _form: {
        recipient: '0x556B14CbdA79A36dC33FcD461a04A5BCb5dC2A70',
        amount: '1',
        token: {
          name: 'Ether',
          decimals: 18,
          symbol: 'ETH',
          address: ETH_CONTRACT
        }
      }
    };

    expect(parseInternalTransaction(transaction)).toMatchSnapshot();
  });

  it('should parse transfer NFT transaction', () => {
    const transaction = {
      _type: 'sendNft' as const,
      to: '0x5A96CF3ace257Dfcc1fd3C037e548585124dc0C5',
      data: '0x42842e0e000000000000000000000000000000000000000000000000000000000000dead000000000000000000000000000000000000000000000000000000000000dead00000000000000000000000000000000000000000000000000000000000000a2',
      value: '0',
      salt: '',
      _form: {
        recipient: '0x556B14CbdA79A36dC33FcD461a04A5BCb5dC2A70',
        amount: '1',
        nft: {
          address: '0x5A96CF3ace257Dfcc1fd3C037e548585124dc0C5',
          id: '810',
          name: 'Weeedidit Palls #101',
          collection: 'Weee Did It Palz'
        }
      }
    };

    expect(parseInternalTransaction(transaction)).toMatchSnapshot();
  });

  it('should parse contract call transaction', () => {
    const transaction = {
      _type: 'contractCall' as const,
      data: '0xd0e30db0',
      salt: '0x000000000000000000000000000000000000000000000000000000000000',
      to: '0x11fE4B6AE13d2a6055C8D9cF65c55bac32B5d844',
      value: '20000000000000000000',
      _form: {
        abi: ['function deposit() payable'],
        amount: '20',
        args: {},
        method: 'deposit()',
        recipient: '0x11fE4B6AE13d2a6055C8D9cF65c55bac32B5d844'
      }
    };

    expect(parseInternalTransaction(transaction)).toMatchSnapshot();
  });

  it('should parse raw transaction', () => {
    const transaction = {
      _type: 'raw' as const,
      to: '0x556B14CbdA79A36dC33FcD461a04A5BCb5dC2A70',
      data: '0x',
      value: '1',
      salt: '',
      _form: {
        recipient: '0x556B14CbdA79A36dC33FcD461a04A5BCb5dC2A70'
      }
    };

    expect(parseInternalTransaction(transaction)).toMatchSnapshot();
  });

  it('should throw on unknown transaction', () => {
    const transaction = {
      _type: 'unknown'
    };

    expect(() => parseInternalTransaction(transaction as any)).toThrowError(
      'Invalid transaction type'
    );
  });
});
