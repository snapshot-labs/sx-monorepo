import { Account, Provider, constants } from 'starknet';
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
  const account = new Account(starkProvider, address, privKey);
  const spaceManager = new SpaceManager({
    starkProvider,
    account
  });

  it('should deploy space', async () => {
    const receipt = await spaceManager.deploySpace({
      controller: address,
      votingDelay: 0,
      minVotingDuration: 0,
      maxVotingDuration: 86400,
      proposalThreshold: 1n,
      qorum: 1n,
      authenticators: ['0x64cce9272197eba6353f5bbf060e097e516b411e66e83a9cf5910a08697df14'],
      votingStrategies: ['0xd1b81feff3095ca9517fdfc7427e742ce96f7ca8f3b2664a21b2fba552493b'],
      votingStrategiesParams: [['0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6', '0x3']],
      executionStrategies: ['0x21dda40770f4317582251cffd5a0202d6b223dc167e5c8db25dc887d11eba81'],
      metadataUri: 'ipfs://bafkreifwhih7x4fxrpa6kp7n7jo6zeuvdlbvx3agm6tiw73toor6m6hvya'
    });
    console.log('Receipt', receipt);

    expect(receipt.transaction_hash).toBeDefined();
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

  it('should set metadata uri', async () => {
    const space = '0x026edc90b91a5f5a1d859141c583d7a4666d8bf4123c3ea401d991f637ef1cfc';

    const receipt = await spaceManager.setMetadataUri(
      space,
      'ipfs://bafkreifwhih7x4fxrpa6kp7n7jo6zeuvdlbvx3agm6tiw73toor6m6hvya'
    );
    console.log('Receipt', receipt);

    expect(receipt.transaction_hash).toBeDefined();
  }, 60e3);
});
