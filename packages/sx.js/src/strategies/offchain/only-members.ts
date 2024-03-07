import { Strategy } from '../../clients/offchain/types';

export default function createOnlyMembersStrategy(): Strategy {
  return {
    type: 'only-members',
    async getVotingPower(spaceId: string, voterAddress: string, params: any) {
      const isValid = params[0].addresses
        .map((address: string) => address.toLowerCase())
        .includes(voterAddress.toLowerCase());

      return [isValid ? 1n : 0n];
    }
  };
}
