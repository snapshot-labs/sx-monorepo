import { OpenZeppelinAuthenticator } from '@snapshot-labs/sx';
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
  discord?: string;
  address: `0x${string}`;
  authenticators: OpenZeppelinAuthenticator[];
  quorumType?: 'for_only';
  startBlock: number;
  readOnlyTreasuries?: Treasury[];
};

export const GOVERNANCES: Partial<
  Record<NetworkID, Record<string, Governance>>
> = {
  eth: {
    ENS: {
      name: 'ENS',
      about: 'Your web3 username.',
      avatar:
        'ipfs://bafkreiftpnmdytmh3ccqsujvehipn5nklcsooy4janusmwt4oujrwisubm',
      externalUrl: 'https://ens.domains',
      github: 'ensdomains',
      twitter: 'ensdomains',
      farcaster: 'ensdomains',
      address: '0x323A76393544d5ecca80cd6ef2A560C6a395b7E3',
      authenticators: [
        'OpenZeppelinAuthenticator',
        'OpenZeppelinAuthenticatorSignatureV4'
      ],
      startBlock: 13533772,
      readOnlyTreasuries: [
        {
          name: 'ENS Endowment',
          address: '0x4F2083f5fBede34C2714aFfb3105539775f7FE64',
          chainId: 1
        },
        {
          name: 'ETH Registrar Controller 2',
          address: '0x59E16fcCd424Cc24e280Be16E11Bcd56fb0CE547',
          chainId: 1
        },
        {
          name: 'ETH Registrar Controller',
          address: '0x253553366Da8546fC250F225fe3d25d0C782303b',
          chainId: 1
        },
        {
          name: 'Old ETH Registrar Controller',
          address: '0x283Af0B28c62C092C9727F1Ee09c02CA627EB7F5',
          chainId: 1
        }
      ]
    }
  },
  bnb: {
    BNB: {
      name: 'BNB Chain',
      avatar:
        'ipfs://bafkreibll4la7wqerzs7zwxjne2j7ayynbg2wlenemssoahxxj5rbt6c64',
      externalUrl: 'https://www.bnbchain.org',
      github: 'bnb-chain',
      twitter: 'BNBChain',
      address: '0x0000000000000000000000000000000000002004',
      authenticators: [
        'OpenZeppelinAuthenticator',
        'OpenZeppelinAuthenticatorSignatureV4'
      ],
      quorumType: 'for_only',
      startBlock: 37959559
    }
  },
  arb1: {
    'Arbitrum Treasury': {
      name: 'Arbitrum Treasury',
      about: 'An onchain platform for all',
      avatar: 'ipfs://QmWZ5SMRfvcK8tycsDqojQaSiKedgtVkS7CkZdxPgeCVsZ',
      externalUrl: 'https://arbitrum.io',
      github: 'OffchainLabs',
      twitter: 'arbitrum',
      address: '0x789fC99093B09aD01C34DC7251D0C89ce743e5a4',
      authenticators: [
        'OpenZeppelinAuthenticator',
        'OpenZeppelinAuthenticatorSignatureV4'
      ],
      startBlock: 70398215
    },
    'Arbitrum Core': {
      name: 'Arbitrum Core',
      about: 'An onchain platform for all',
      avatar: 'ipfs://QmWZ5SMRfvcK8tycsDqojQaSiKedgtVkS7CkZdxPgeCVsZ',
      externalUrl: 'https://arbitrum.io',
      github: 'OffchainLabs',
      twitter: 'arbitrum',
      address: '0xf07DeD9dC292157749B6Fd268E37DF6EA38395B9',
      authenticators: [
        'OpenZeppelinAuthenticator',
        'OpenZeppelinAuthenticatorSignatureV4'
      ],
      startBlock: 70398215
    }
    /*
    GMX: {
      name: 'GMX',
      about:
        'On-chain perpetual & spot dex: BTC, ETH, SOL and many other top crypto assets available with up to 100x leverage directly from your own wallet',
      avatar:
        'ipfs://bafkreidi2f72ct7y5y32hgjwblnfpul4fsac7o5av665o2ydm6th27unc4',
      externalUrl: 'https://gmx.io',
      github: 'gmx-io',
      twitter: 'GMX_IO',
      discord: 'H5PeQru3Aa',
      address: '0x03e8f708e9C85EDCEaa6AD7Cd06824CeB82A7E68',
      authenticators: [
        'OpenZeppelinAuthenticator',
        'OpenZeppelinAuthenticatorSignatureV5'
      ],
      quorumType: 'for_only',
      startBlock: 204249812
    }
    */
  },
  sep: {
    Sekhmet: {
      name: 'Sekhmet',
      address: '0xB314FAC800bD0F5646e1a230b212Ed88936648e0',
      startBlock: 9187848,
      authenticators: [
        'OpenZeppelinAuthenticator',
        'OpenZeppelinAuthenticatorSignatureV5'
      ]
    }
  }
};
