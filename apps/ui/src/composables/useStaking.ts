import { ETH_CONTRACT } from '@/helpers/constants';
import type { NetworkID } from '@/types';
import type { Token } from '@/helpers/alchemy';

const STAKING_CONTRACTS = {
  eth: {
    address: '0xae7ab96520de3a18e5e111b5eaab095312d7fe84',
    referral: '0x01e8CEC73B020AB9f822fD0dee3Aa4da2fe39e38'
  },
  sep: {
    address: '0x3e3FE7dBc6B4C189E7128855dD526361c49b40Af',
    referral: '0x8C28Cf33d9Fd3D0293f963b1cd27e3FF422B425c'
  }
};

export function useStaking() {
  function isStakeable(networkId: NetworkID, token: Token) {
    return (
      Object.keys(STAKING_CONTRACTS).includes(networkId) && token.contractAddress === ETH_CONTRACT
    );
  }

  return { isStakeable };
}
