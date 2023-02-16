import type { Strategy } from '../../clients/evm/types';

export default function createVanillaStrategy(): Strategy {
  return {
    type: 'vanilla',
    async getParams(): Promise<string> {
      return '0x00';
    }
  };
}
