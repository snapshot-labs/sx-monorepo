import { API_TESTNET_URL, API_URL } from '@/helpers/constants';

type Metadata = {
  name: string;
  ticker?: string;
  chainId: number;
  currentChainId?: number;
  apiUrl: string;
  avatar: string;
};

export const METADATA: Record<string, Metadata> = {
  matic: {
    name: 'Polygon',
    ticker: 'MATIC',
    chainId: 137,
    apiUrl: API_URL,
    avatar: 'ipfs://bafkreihcx4zkpfjfcs6fazjp6lcyes4pdhqx3uvnjuo5uj2dlsjopxv5am'
  },
  arb1: {
    name: 'Arbitrum One',
    chainId: 42161,
    currentChainId: 1,
    apiUrl: API_URL,
    avatar: 'ipfs://bafkreic2p3zzafvz34y4tnx2kaoj6osqo66fpdo3xnagocil452y766gdq'
  },
  oeth: {
    name: 'OP Mainnet',
    chainId: 10,
    apiUrl: API_URL,
    avatar: 'ipfs://bafkreifu2remiqfpsb4hgisbwb3qxedrzpwsea7ik4el45znjcf56xf2ku'
  },
  base: {
    name: 'Base',
    chainId: 8453,
    apiUrl: API_URL,
    avatar: 'ipfs://bafkreid4ek4gnj6ccxl3yubwj2wr3d5t6dqelvvh4hv5wo5eldkqs725ri'
  },
  mnt: {
    name: 'Mantle',
    ticker: 'MNT',
    chainId: 5000,
    apiUrl: API_URL,
    avatar: 'ipfs://bafkreidkucwfn4mzo2gtydrt2wogk3je5xpugom67vhi4h4comaxxjzoz4'
  },
  eth: {
    name: 'Ethereum',
    chainId: 1,
    apiUrl: API_URL,
    avatar: 'ipfs://bafkreid7ndxh6y2ljw2jhbisodiyrhcy2udvnwqgon5wgells3kh4si5z4'
  },
  ape: {
    name: 'ApeChain',
    ticker: 'APE',
    chainId: 33139,
    currentChainId: 1,
    apiUrl: API_URL,
    avatar: 'ipfs://bafkreielbgcox2jsw3g6pqulqb7pyjgx7czjt6ahnibihaij6lozoy53w4'
  },
  curtis: {
    name: 'Curtis',
    ticker: 'APE',
    chainId: 33111,
    currentChainId: 11155111,
    apiUrl: API_TESTNET_URL,
    avatar: 'ipfs://bafkreielbgcox2jsw3g6pqulqb7pyjgx7czjt6ahnibihaij6lozoy53w4'
  },
  sep: {
    name: 'Ethereum Sepolia',
    chainId: 11155111,
    apiUrl: API_TESTNET_URL,
    avatar: 'ipfs://bafkreid7ndxh6y2ljw2jhbisodiyrhcy2udvnwqgon5wgells3kh4si5z4'
  }
};
