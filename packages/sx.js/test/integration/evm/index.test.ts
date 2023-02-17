import { JsonRpcProvider } from '@ethersproject/providers';
import { Wallet } from '@ethersproject/wallet';
import { EthereumTx } from '../../../src/clients/evm/ethereum-tx';
import { EthereumSig } from '../../../src/clients/evm/ethereum-sig';
import { setup, TestConfig } from './utils';

describe('EthereumTx', () => {
  const PROPOSAL_ID = 1;

  const provider = new JsonRpcProvider('http://127.0.0.1:8545');
  const signer = new Wallet(
    '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
    provider
  );

  let ethTxClient: EthereumTx;
  let ethSigClient: EthereumSig;
  let testConfig: TestConfig;
  let spaceAddress = '';
  beforeAll(async () => {
    testConfig = await setup(signer);

    ethTxClient = new EthereumTx({ networkConfig: testConfig.networkConfig });
    ethSigClient = new EthereumSig({ networkConfig: testConfig.networkConfig });

    const controller = await signer.getAddress();

    const res = await ethTxClient.deploySpace({
      signer,
      controller,
      votingDelay: 0,
      minVotingDuration: 0,
      maxVotingDuration: 86400,
      proposalThreshold: 1n,
      quorum: 1n,
      authenticators: [
        testConfig.vanillaAuthenticator,
        testConfig.ethTxAuthenticator,
        testConfig.ethSigAuthenticator
      ],
      votingStrategies: [
        {
          addy: testConfig.vanillaVotingStrategy,
          params: '0x00'
        },
        {
          addy: testConfig.compVotingStrategy,
          params: testConfig.compToken
        }
      ],
      executionStrategies: [testConfig.executionStrategy]
    });

    spaceAddress = res.spaceAddress;
  });

  describe('vanilla authenticator', () => {
    it('should propose via authenticator', async () => {
      const envelope = {
        data: {
          space: spaceAddress,
          authenticator: testConfig.vanillaAuthenticator,
          strategies: [{ index: 0, address: testConfig.vanillaVotingStrategy }],
          executor: testConfig.executionStrategy,
          metadataUri: 'ipfs://QmNrm6xKuib1THtWkiN5CKtBEerQCDpUtmgDqiaU2xDmca',
          executionParams: []
        }
      };

      const res = await ethTxClient.propose({
        signer,
        envelope
      });
      expect(res.hash).toBeDefined();
    });

    it('should vote via authenticator', async () => {
      const envelope = {
        data: {
          space: spaceAddress,
          authenticator: testConfig.vanillaAuthenticator,
          strategies: [{ index: 0, address: testConfig.vanillaVotingStrategy }],
          executionParams: [],
          proposal: 1,
          choice: 0
        }
      };

      const res = await ethTxClient.vote({
        signer,
        envelope
      });
      expect(res.hash).toBeDefined();
    });
  });

  describe('ethTx authenticator', () => {
    it('should propose via authenticator', async () => {
      const envelope = {
        data: {
          space: spaceAddress,
          authenticator: testConfig.ethTxAuthenticator,
          strategies: [{ index: 0, address: testConfig.vanillaVotingStrategy }],
          executor: testConfig.executionStrategy,
          metadataUri: 'ipfs://QmNrm6xKuib1THtWkiN5CKtBEerQCDpUtmgDqiaU2xDmca',
          executionParams: []
        }
      };

      const res = await ethTxClient.propose({
        signer,
        envelope
      });
      expect(res.hash).toBeDefined();
    });

    it('should vote via authenticator', async () => {
      const envelope = {
        data: {
          space: spaceAddress,
          authenticator: testConfig.ethTxAuthenticator,
          strategies: [{ index: 0, address: testConfig.vanillaVotingStrategy }],
          executionParams: [],
          proposal: 2,
          choice: 0
        }
      };

      const res = await ethTxClient.vote({
        signer,
        envelope
      });
      expect(res.hash).toBeDefined();
    });
  });

  describe('ethSig authenticator', () => {
    it('should propose via authenticator', async () => {
      const envelope = await ethSigClient.propose({
        signer,
        data: {
          space: spaceAddress,
          authenticator: testConfig.ethSigAuthenticator,
          strategies: [{ index: 0, address: testConfig.vanillaVotingStrategy }],
          executor: testConfig.executionStrategy,
          metadataUri: 'ipfs://QmNrm6xKuib1THtWkiN5CKtBEerQCDpUtmgDqiaU2xDmca',
          executionParams: []
        }
      });

      const res = await ethTxClient.propose({
        signer,
        envelope
      });
      expect(res.hash).toBeDefined();
    });

    it('should vote via authenticator', async () => {
      const envelope = await ethSigClient.vote({
        signer,
        data: {
          space: spaceAddress,
          authenticator: testConfig.ethSigAuthenticator,
          strategies: [{ index: 0, address: testConfig.vanillaVotingStrategy }],
          proposal: 3,
          choice: 0
        }
      });

      const res = await ethTxClient.vote({
        signer,
        envelope
      });
      expect(res.hash).toBeDefined();
    });
  });

  describe('compVotingStrategy + vanilla authenticator', () => {
    it('should propose via authenticator', async () => {
      const envelope = {
        data: {
          space: spaceAddress,
          authenticator: testConfig.vanillaAuthenticator,
          strategies: [{ index: 1, address: testConfig.compVotingStrategy }],
          executor: testConfig.executionStrategy,
          metadataUri: 'ipfs://QmNrm6xKuib1THtWkiN5CKtBEerQCDpUtmgDqiaU2xDmca',
          executionParams: []
        }
      };

      const res = await ethTxClient.propose({
        signer,
        envelope
      });
      expect(res.hash).toBeDefined();
    });

    it('should vote via authenticator', async () => {
      const envelope = {
        data: {
          space: spaceAddress,
          authenticator: testConfig.vanillaAuthenticator,
          strategies: [{ index: 1, address: testConfig.compVotingStrategy }],
          executionParams: [],
          proposal: 4,
          choice: 0
        }
      };

      const res = await ethTxClient.vote({
        signer,
        envelope
      });
      expect(res.hash).toBeDefined();
    });
  });

  it.skip('should finalize', async () => {
    const res = await ethTxClient.finalizeProposal({
      signer,
      space: spaceAddress,
      proposal: PROPOSAL_ID,
      executionParams: '0x00'
    });
    expect(res.hash).toBeDefined();
  });

  it('should cancel', async () => {
    const res = await ethTxClient.cancelProposal({
      signer,
      space: spaceAddress,
      proposal: PROPOSAL_ID,
      executionParams: '0x00'
    });
    expect(res.hash).toBeDefined();
  });

  it('should get proposal', async () => {
    const res = await ethTxClient.getProposal({
      signer,
      space: spaceAddress,
      proposal: PROPOSAL_ID
    });
    expect(res.startTimestamp).toBeGreaterThan(0);
  });

  it('should get proposal status', async () => {
    const res = await ethTxClient.getProposalStatus({
      signer,
      space: spaceAddress,
      proposal: PROPOSAL_ID
    });
    expect(typeof res).toBe('number');
  });

  it('should set max voting duration', async () => {
    const res = await ethTxClient.setMaxVotingDuration({
      signer,
      space: spaceAddress,
      maxVotingDuration: 80000
    });
    expect(res.hash).toBeDefined();
  });

  it('should set min voting duration', async () => {
    const res = await ethTxClient.setMinVotingDuration({
      signer,
      space: spaceAddress,
      minVotingDuration: 5000
    });
    expect(res.hash).toBeDefined();
  });

  it('should set metadata uri', async () => {
    const res = await ethTxClient.setMetadataUri({
      signer,
      space: spaceAddress,
      metadataUri: 'https://snapshot.org'
    });
    expect(res.hash).toBeDefined();
  });

  it('should set proposal threshold', async () => {
    const res = await ethTxClient.setProposalThreshold({
      signer,
      space: spaceAddress,
      threshold: 0
    });
    expect(res.hash).toBeDefined();
  });

  it('should set voting delay', async () => {
    const res = await ethTxClient.setVotingDelay({ signer, space: spaceAddress, votingDelay: 10 });
    expect(res.hash).toBeDefined();
  });
});
