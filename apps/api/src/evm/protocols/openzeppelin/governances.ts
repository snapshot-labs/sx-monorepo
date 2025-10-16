import { NetworkID } from '../../types';

type Governance = {
  name: string;
  address: `0x${string}`;
  startBlock: number;
};

export const GOVERNANCES: Partial<
  Record<NetworkID, Record<string, Governance>>
> = {
  eth: {
    ENS: {
      name: 'ENS',
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
