import { JsonRpcProvider } from '@ethersproject/providers';
import { Wallet } from '@ethersproject/wallet';
import { SnapshotEVMClient } from '../../../src/clients/evm';
import { deployDependency } from './utils';
import VanillaAuthenciatorContract from './fixtures/VanillaAuthenticator.json';
import VanillaVotingStrategyContract from './fixtures/VanillaVotingStrategy.json';
import VanillaExecutionStrategyContract from './fixtures/VanillaExecutionStrategy.json';

describe('SnapshotEVMClient', () => {
  const PROPOSAL_ID = 1;

  const provider = new JsonRpcProvider('http://127.0.0.1:8545');
  const signer = new Wallet(
    '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
    provider
  );
  const client = new SnapshotEVMClient();

  let authenticator = '';
  let votingStrategy = '';
  let executionStrategy = '';
  let spaceAddress = '';
  beforeAll(async () => {
    authenticator = await deployDependency(signer, VanillaAuthenciatorContract);
    votingStrategy = await deployDependency(signer, VanillaVotingStrategyContract);
    executionStrategy = await deployDependency(signer, VanillaExecutionStrategyContract);

    const owner = await signer.getAddress();

    const res = await client.deploy({
      signer,
      owner,
      votingDelay: 0,
      minVotingDuration: 0,
      maxVotingDuration: 86400,
      proposalThreshold: 0,
      quorum: 1,
      authenticators: [authenticator],
      votingStrategies: [
        {
          addy: votingStrategy,
          params: '0x00'
        }
      ],
      executionStrategies: [executionStrategy]
    });

    spaceAddress = res.address;
  });

  it('should propose via authenticator', async () => {
    const res = await client.propose({
      signer,
      space: spaceAddress,
      authenticator,
      userVotingStrategies: [
        {
          index: 0,
          params: '0x00'
        }
      ],
      executionStrategy: { addy: executionStrategy, params: '0x00' },
      metadataUri: 'https://snapshot.org'
    });
    expect(res.hash).toBeDefined();
  });

  it('should vote via authenticator', async () => {
    const res = await client.vote({
      signer,
      space: spaceAddress,
      authenticator,
      userVotingStrategies: [
        {
          index: 0,
          params: '0x00'
        }
      ],
      proposal: PROPOSAL_ID,
      choice: 0
    });
    expect(res.hash).toBeDefined();
  });

  it.skip('should finalize', async () => {
    const res = await client.finalizeProposal({
      signer,
      space: spaceAddress,
      proposal: PROPOSAL_ID,
      executionParams: '0x00'
    });
    expect(res.hash).toBeDefined();
  });

  it('should cancel', async () => {
    const res = await client.cancelProposal({
      signer,
      space: spaceAddress,
      proposal: PROPOSAL_ID,
      executionParams: '0x00'
    });
    expect(res.hash).toBeDefined();
  });

  it('should get proposal', async () => {
    const res = await client.getProposal({ signer, space: spaceAddress, proposal: PROPOSAL_ID });
    expect(res.startTimestamp).toBeGreaterThan(0);
  });

  it('should get proposal status', async () => {
    const res = await client.getProposalStatus({
      signer,
      space: spaceAddress,
      proposal: PROPOSAL_ID
    });
    expect(typeof res).toBe('number');
  });

  it('should set max voting duration', async () => {
    const res = await client.setMaxVotingDuration({
      signer,
      space: spaceAddress,
      maxVotingDuration: 80000
    });
    expect(res.hash).toBeDefined();
  });

  it('should set min voting duration', async () => {
    const res = await client.setMinVotingDuration({
      signer,
      space: spaceAddress,
      minVotingDuration: 5000
    });
    expect(res.hash).toBeDefined();
  });

  it('should set metadata uri', async () => {
    const res = await client.setMetadataUri({
      signer,
      space: spaceAddress,
      metadataUri: 'https://snapshot.org'
    });
    expect(res.hash).toBeDefined();
  });

  it('should set proposal threshold', async () => {
    const res = await client.setProposalThreshold({ signer, space: spaceAddress, threshold: 0 });
    expect(res.hash).toBeDefined();
  });

  it('should set voting delay', async () => {
    const res = await client.setVotingDelay({ signer, space: spaceAddress, votingDelay: 10 });
    expect(res.hash).toBeDefined();
  });
});
