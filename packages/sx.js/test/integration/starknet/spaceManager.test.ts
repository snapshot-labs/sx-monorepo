import { Account, Provider, ec, constants } from 'starknet';
import { parseEther } from '@ethersproject/units';
import { SpaceManager } from '../../../src/clients';

describe('SpaceManager', () => {
  expect(process.env.STARKNET_ADDRESS).toBeDefined();
  expect(process.env.STARKNET_PK).toBeDefined();

  const address = process.env.STARKNET_ADDRESS as string;
  const privKey = process.env.STARKNET_PK as string;

  const starkProvider = new Provider({
    sequencer: {
      baseUrl: 'https://alpha4-2.starknet.io',
      chainId: constants.StarknetChainId.TESTNET2
    }
  });
  const account = new Account(starkProvider, address, ec.getKeyPair(privKey));
  const spaceManager = new SpaceManager({
    starkProvider,
    account
  });

  it('should finalizeProposal', async () => {
    const space = '0x07e6e9047eb910f84f7e3b86cea7b1d7779c109c970a39b54379c1f4fa395b28';
    const proposalId = 52;
    const executor = '0x21dda40770f4317582251cffd5a0202d6b223dc167e5c8db25dc887d11eba81';

    const transactions = [
      {
        to: '0x556B14CbdA79A36dC33FcD461a04A5BCb5dC2A70',
        value: parseEther('0.01').toHexString(),
        data: '0x',
        operation: 0,
        nonce: 0
      }
    ];

    const receipt = await spaceManager.finalizeProposal(space, proposalId, executor, {
      transactions
    });
    console.log('Receipt', receipt);

    expect(receipt.transaction_hash).toBeDefined();
  }, 60e3);
});
