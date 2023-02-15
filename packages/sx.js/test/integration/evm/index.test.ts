import { JsonRpcProvider } from '@ethersproject/providers';
import { Wallet } from '@ethersproject/wallet';
import { SnapshotEVMClient } from '../../../src/clients/evm';
import { deployDependency } from './utils';
import SpaceFactoryContract from './fixtures/SpaceFactory.json';
import VanillaAuthenciatorContract from './fixtures/VanillaAuthenticator.json';
import EthTxAuthenticatorContract from './fixtures/EthTxAuthenticator.json';
import VanillaVotingStrategyContract from './fixtures/VanillaVotingStrategy.json';
import VanillaExecutionStrategyContract from './fixtures/VanillaExecutionStrategy.json';

describe('SnapshotEVMClient', () => {
  const PROPOSAL_ID = 1;

  const provider = new JsonRpcProvider('http://127.0.0.1:8545');
  const signer = new Wallet(
    '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
    provider
  );

  let spaceFactory = '';
  let client: SnapshotEVMClient;
  let vanillaAuthenticator = '';
  let ethTxAuthenticator = '';
  let votingStrategy = '';
  let executionStrategy = '';
  let spaceAddress = '';
  beforeAll(async () => {
    spaceFactory = await deployDependency(signer, SpaceFactoryContract);
    vanillaAuthenticator = await deployDependency(signer, VanillaAuthenciatorContract);
    ethTxAuthenticator = await deployDependency(signer, EthTxAuthenticatorContract);
    votingStrategy = await deployDependency(signer, VanillaVotingStrategyContract);
    executionStrategy = await deployDependency(signer, VanillaExecutionStrategyContract);

    client = new SnapshotEVMClient({
      networkConfig: {
        spaceFactory: '0x00',
        authenticators: {
          [vanillaAuthenticator]: {
            type: 'vanilla'
          },
          [ethTxAuthenticator]: {
            type: 'ethTx'
          }
        },
        strategies: {
          [votingStrategy]: {
            type: 'vanilla'
          }
        },
        executors: {
          [executionStrategy]: {
            type: 'vanilla'
          }
        }
      }
    });

    const owner = await signer.getAddress();

    const res = await client.deploy({
      signer,
      spaceFactory,
      owner,
      votingDelay: 0,
      minVotingDuration: 0,
      maxVotingDuration: 86400,
      proposalThreshold: 0,
      quorum: 1,
      authenticators: [vanillaAuthenticator, ethTxAuthenticator],
      votingStrategies: [
        {
          addy: votingStrategy,
          params: '0x00'
        }
      ],
      executionStrategies: [executionStrategy]
    });

    spaceAddress = res.spaceAddress;
  });

  describe('vanilla authenticator', () => {
    it('should propose via authenticator', async () => {
      const address = await signer.getAddress();

      const envelope = {
        address,
        sig: null,
        data: {
          message: {
            space: spaceAddress,
            authenticator: vanillaAuthenticator,
            strategies: [0],
            executor: executionStrategy,
            metadataUri: 'ipfs://QmNrm6xKuib1THtWkiN5CKtBEerQCDpUtmgDqiaU2xDmca',
            executionParams: []
          }
        }
      };

      const res = await client.propose({
        signer,
        envelope
      });
      expect(res.hash).toBeDefined();
    });

    it('should vote via authenticator', async () => {
      const address = await signer.getAddress();

      const envelope = {
        address,
        sig: null,
        data: {
          message: {
            space: spaceAddress,
            authenticator: vanillaAuthenticator,
            strategies: [0],
            executionParams: [],
            proposal: 1,
            choice: 0
          }
        }
      };

      const res = await client.vote({
        signer,
        envelope
      });
      expect(res.hash).toBeDefined();
    });
  });

  describe('ethTx authenticator', () => {
    it('should propose via authenticator', async () => {
      const address = await signer.getAddress();

      const envelope = {
        address,
        sig: null,
        data: {
          message: {
            space: spaceAddress,
            authenticator: ethTxAuthenticator,
            strategies: [0],
            executor: executionStrategy,
            metadataUri: 'ipfs://QmNrm6xKuib1THtWkiN5CKtBEerQCDpUtmgDqiaU2xDmca',
            executionParams: []
          }
        }
      };

      const res = await client.propose({
        signer,
        envelope
      });
      expect(res.hash).toBeDefined();
    });

    it('should vote via authenticator', async () => {
      const address = await signer.getAddress();

      const envelope = {
        address,
        sig: null,
        data: {
          message: {
            space: spaceAddress,
            authenticator: ethTxAuthenticator,
            strategies: [0],
            executionParams: [],
            proposal: 2,
            choice: 0
          }
        }
      };

      const res = await client.vote({
        signer,
        envelope
      });
      expect(res.hash).toBeDefined();
    });
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
