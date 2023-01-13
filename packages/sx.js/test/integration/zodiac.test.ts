import { Wallet } from '@ethersproject/wallet';
import { JsonRpcProvider } from '@ethersproject/providers';
import { parseEther } from '@ethersproject/units';
import { Zodiac } from '../../src/clients/zodiac';

describe('Zodiac', () => {
  expect(process.env.ETH_PK).toBeDefined();

  const provider = new JsonRpcProvider(process.env.GOERLI_NODE_URL);
  const signer = new Wallet(process.env.ETH_PK as string, provider);
  const space = '0x07e6e9047eb910f84f7e3b86cea7b1d7779c109c970a39b54379c1f4fa395b28';
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

  const zodiac = new Zodiac({ signer });

  it('should receiveProposal', async () => {
    const receipt = await zodiac.receiveProposal(space, executor, {
      transactions
    });
    console.log('Receipt', receipt);

    expect(receipt).toBeDefined();
  }, 60e3);

  it('should executeProposalTx', async () => {
    const proposalIndex = 0;

    const receipt = await zodiac.executeProposalTx(proposalIndex, executor, transactions[0]);
    console.log('Receipt', receipt);

    expect(receipt).toBeDefined();
  }, 60e3);
});
