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
  address: `0x${string}`;
  authenticators: OpenZeppelinAuthenticator[];
  startBlock: number;
  treasuries?: Treasury[];
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
      treasuries: [
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
