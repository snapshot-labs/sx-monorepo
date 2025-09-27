import { NetworkID } from '../../types';

type Governance = {
  name: string;
  about?: string;
  avatar?: string;
  externalUrl?: string;
  github?: string;
  twitter?: string;
  farcaster?: string;
  address: `0x${string}`;
  startBlock: number;
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
      startBlock: 13533772
    }
  },
  sep: {
    Sekhmet: {
      name: 'Sekhmet',
      address: '0xB314FAC800bD0F5646e1a230b212Ed88936648e0',
      startBlock: 9187848
    }
  }
};
