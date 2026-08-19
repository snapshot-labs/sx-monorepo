import { GovernorBravoAuthenticator } from '@snapshot-labs/sx';
import { NetworkID } from '../../types';

export type Treasury = {
  name: string;
  address: string;
  chainId: number;
};

type Governance = {
  name: string;
  about?: string;
  avatar?: string;
  externalUrl?: string;
  github?: string;
  twitter?: string;
  farcaster?: string;
  address: `0x${string}`;
  authenticators: GovernorBravoAuthenticator[];
  symbol: string;
  decimals: number;
  governanceToken: string;
  treasury: Treasury;
  verified?: boolean;
  startBlock: number;
};

export const GOVERNANCES: Partial<
  Record<NetworkID, Record<string, Governance>>
> = {
  eth: {
    Compound: {
      name: 'Compound',
      about: 'Building infrastructure for the future of finance.',
      avatar:
        'ipfs://bafkreia4lin2o6uux2375uhekvgqlr466tes7gsdzg6aldakw5jicylcd4',
      externalUrl: 'https://compound.finance',
      github: 'compound-finance',
      twitter: 'compoundfinance',
      address: '0xc0Da02939E1441F497fd74F78cE7Decb17B66529',
      authenticators: [
        'GovernorBravoAuthenticator',
        'GovernorBravoAuthenticatorSignature'
      ],
      symbol: 'COMP',
      decimals: 18,
      governanceToken: '0xc00e94Cb662C3520282E6f5717214004A7f26888',
      treasury: {
        name: 'Timelock',
        address: '0x6d903f6003cca6255D85CcA4D3B5E5146dC33925',
        chainId: 1
      },
      verified: true,
      startBlock: 12006099
    },
    Uniswap: {
      name: 'Uniswap',
      about:
        'The largest onchain marketplace. Buy and sell crypto on Ethereum and 14+ other chains.',
      avatar:
        'ipfs://bafkreigzzj4yc3khx4mn2zmdrdgtvae3s36e5ae2sgry2azuqvxfakjuoa',
      externalUrl: 'https://app.uniswap.org',
      github: 'uniswap',
      twitter: 'Uniswap',
      farcaster: 'uniswap',
      address: '0x408ED6354d4973f66138C91495F2f2FCbd8724C3',
      authenticators: [
        'GovernorBravoAuthenticator',
        'GovernorBravoAuthenticatorSignature'
      ],
      symbol: 'UNI',
      decimals: 18,
      governanceToken: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
      treasury: {
        name: 'Timelock',
        address: '0x1a9C8182C09F50C8318d769245beA52c32BE35BC',
        chainId: 1
      },
      verified: true,
      startBlock: 12006099
    },
    InstaDapp: {
      name: 'InstaDapp',
      about:
        "The world's most advanced platform to start leveraging the full potential of Decentralised Finance.",
      avatar:
        'ipfs://bafkreiasyhlnhknguom4n4yiaycppursassbqazpc7gze7ol5d7enjgk5a',
      address: '0x0204Cd037B2ec03605CFdFe482D8e257C765fA1B',
      authenticators: [
        'GovernorBravoAuthenticator',
        'GovernorBravoAuthenticatorSignature'
      ],
      symbol: 'FLUID',
      decimals: 18,
      governanceToken: '0x6f40d4A6237C257fff2dB00FA0510DeEECd303eb',
      treasury: {
        name: 'Timelock',
        address: '0x2386DC45AdDed673317eF068992F19421B481F4c',
        chainId: 1
      },
      startBlock: 12006099
    },
    'Rari Capital': {
      name: 'Rari Capital',
      about:
        'Yield aggregation, Fuse, tranches, governance — we are here to build Finance 2.0.',
      avatar:
        'ipfs://bafkreihpjg7f3uqizahy7kqxyjmxw4a5hymqzs3ohx2ecw356seycsebxm',
      address: '0x91d9c2b5cF81D55a5f2Ecc0fC84E62f9cd2ceFd6',
      authenticators: [
        'GovernorBravoAuthenticator',
        'GovernorBravoAuthenticatorSignature'
      ],
      symbol: 'RGT',
      decimals: 18,
      governanceToken: '0xD291E7a03283640FDc51b121aC401383A46cC623',
      treasury: {
        name: 'Timelock',
        address: '0x8ace03Fc45139fDDba944c6A4082b604041d19FC',
        chainId: 1
      },
      startBlock: 12006099
    },
    Ampleforth: {
      name: 'Ampleforth',
      about:
        'Connect with the community developing digital public goods, creating financial freedom, and defining the future of the open web',
      avatar:
        'ipfs://bafkreieuuri43lqn6zlllhqvidgbqj4tvmhucbldoeoehuqsms77uwfmhe',
      address: '0x8a994C6F55Be1fD2B4d0dc3B8f8F7D4E3a2dA8F1',
      authenticators: [
        'GovernorBravoAuthenticator',
        'GovernorBravoAuthenticatorSignature'
      ],
      symbol: 'FORTH',
      decimals: 18,
      governanceToken: '0x77FbA179C79De5B7653F68b5039Af940AdA60ce0',
      treasury: {
        name: 'Timelock',
        address: '0x223592a191ECfC7FDC38a9256c3BD96E771539A9',
        chainId: 1
      },
      startBlock: 12006099
    }
  },
  sep: {
    'Sepolia Governor Bravo': {
      name: 'Sepolia Governor Bravo',
      address: '0x69112D158A607DD388034c0C09242FF966985258',
      authenticators: [
        'GovernorBravoAuthenticator',
        'GovernorBravoAuthenticatorSignature'
      ],
      symbol: 'MOCK',
      decimals: 18,
      governanceToken: '0xc27427e6B1a112eD59f9dB58c34BC13a7ee76546',
      treasury: {
        name: 'Timelock',
        address: '0x52f26d07f8fEf1CF806A53159ce68bf1B4031baB',
        chainId: 11155111
      },
      verified: true,
      startBlock: 9025765
    }
  }
};
