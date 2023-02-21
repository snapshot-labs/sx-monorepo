import type { Strategy } from '../../clients/evm/types';

export default function createWhitelistStrategy(): Strategy {
  return {
    type: 'whitelist',
    async getParams(): Promise<string> {
      return '0x00';
    }
  };
}
