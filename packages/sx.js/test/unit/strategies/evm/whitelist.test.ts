import { JsonRpcProvider } from '@ethersproject/providers';
import { AbiCoder } from '@ethersproject/abi';
import createWhitelistStrategy from '../../../../src/strategies/evm/whitelist';

describe('whitelistStrategy', () => {
  const whitelistStrategy = createWhitelistStrategy();

  const provider = new JsonRpcProvider('https://rpc.brovider.xyz/5');
  const whitelist = [
    {
      addr: '0x556B14CbdA79A36dC33FcD461a04A5BCb5dC2A70',
      vp: 21n
    }
  ];

  const abiCoder = new AbiCoder();
  const whitelistParams = abiCoder.encode(['tuple(address addr, uint256 vp)[]'], [whitelist]);

  it('should return type', () => {
    expect(whitelistStrategy.type).toBe('whitelist');
  });

  describe('getVotingPower', () => {
    it('should compute voting power for whitelisted user', async () => {
      const votingPower = await whitelistStrategy.getVotingPower(
        '0xc89a0c93af823f794f96f7b2b63fc2a1f1ae9427',
        '0x556B14CbdA79A36dC33FcD461a04A5BCb5dC2A70',
        1677159023,
        whitelistParams,
        provider
      );

      expect(votingPower.toString()).toEqual('21');
    });

    it('should compute voting power for non-whitelisted user', async () => {
      const votingPower = await whitelistStrategy.getVotingPower(
        '0xc89a0c93af823f794f96f7b2b63fc2a1f1ae9427',
        '0x000000000000000000000000000000000000dead',
        1677159023,
        whitelistParams,
        provider
      );

      expect(votingPower.toString()).toEqual('0');
    });
  });
});
