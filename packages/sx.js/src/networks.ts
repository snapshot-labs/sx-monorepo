import type { NetworkConfig } from './types';

export const evmGoerli: NetworkConfig = {
  spaceFactory: '0xf8d933026b7bd549314a31e6c5b2616c631a9e87',
  authenticators: {
    '0x86bfa0726cba0febeee457f04b705ab74b54d01c': {
      type: 'vanilla'
    },
    '0x486039513b72967cd81272f204d4eaff68d0dfd0': {
      type: 'ethSig'
    },
    '0x37315ce75920b653f0f13734c709e199876455c9': {
      type: 'ethTx'
    }
  },
  strategies: {
    '0x395ed61716b48dc904140b515e9f682e33330154': {
      type: 'vanilla'
    },
    '0xbbd17346378f76c1c94032594b57c93c24857b19': {
      type: 'comp'
    },
    '0xc89a0c93af823f794f96f7b2b63fc2a1f1ae9427': {
      type: 'whitelist'
    }
  },
  executors: {
    '0xb1001fdf62c020761039a750b27e73c512fdaa5e': {
      type: 'vanilla'
    }
  }
};

export const goerli2: NetworkConfig = {
  spaceFactory: '0x00e1e511e496a72791ab3d591ba7d571a32de4261d84e4d183f26b6325970e20',
  authenticators: {
    '0x05e1f273ca9a11f78bfb291cbe1b49294cf3c76dd48951e7ab7db6d9fb1e7d62': {
      type: 'vanilla'
    },
    '0x064cce9272197eba6353f5bbf060e097e516b411e66e83a9cf5910a08697df14': {
      type: 'ethSig'
    }
  },
  strategies: {
    '0x058623786b93d9b6ed1f83cec5c6fa6bea5f399d2795ee56a6123bdd83f5aa48': {
      type: 'vanilla'
    },
    '0x00d1b81feff3095ca9517fdfc7427e742ce96f7ca8f3b2664a21b2fba552493b': {
      type: 'singleSlotProof',
      params: {
        fossilL1HeadersStoreAddress:
          '0x69606dd1655fdbbf8189e88566c54890be8f7e4a3650398ac17f6586a4a336d',
        fossilFactRegistryAddress:
          '0x2e39818908f0da118fde6b88b52e4dbdf13d2e171e488507f40deb6811bde3f'
      }
    }
  },
  executors: {
    '1': {
      type: 'starknet'
    },
    '0x4ecc83848a519cc22b0d0ffb70e65ec8dde85d3d13439eff7145d4063cf6b4d': {
      type: 'vanilla'
    },
    '0x21dda40770f4317582251cffd5a0202d6b223dc167e5c8db25dc887d11eba81': {
      type: 'ethRelayer',
      params: {
        destination: '0x196F0548E3140D2C7f6532a206dd54FbC12232a4',
        chainId: 5
      }
    }
  }
};

export const defaultNetwork = goerli2;
