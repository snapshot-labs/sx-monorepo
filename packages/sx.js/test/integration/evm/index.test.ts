import { JsonRpcProvider } from '@ethersproject/providers';
import { Wallet } from '@ethersproject/wallet';
import { EthereumTx } from '../../../src/clients/evm/ethereum-tx';
import { EthereumSig } from '../../../src/clients/evm/ethereum-sig';
import { getExecutionData } from '../../../src/executors';
import { setup, TestConfig } from './utils';

describe('EthereumTx', () => {
  const PROPOSAL_ID = 1;

  const provider = new JsonRpcProvider('http://127.0.0.1:8545');
  const signer = new Wallet(
    '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
    provider
  );
  const manaSigner = new Wallet(
    '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
    provider
  );

  let ethTxClient: EthereumTx;
  let ethSigClient: EthereumSig;
  let testConfig: TestConfig;
  let spaceAddress = '';
  beforeAll(async () => {
    testConfig = await setup(signer);
    spaceAddress = testConfig.spaceAddress;

    ethTxClient = new EthereumTx({ networkConfig: testConfig.networkConfig });
    ethSigClient = new EthereumSig({ networkConfig: testConfig.networkConfig });
  });

  describe('vanilla authenticator', () => {
    it('should propose via authenticator', async () => {
      const envelope = {
        data: {
          space: spaceAddress,
          authenticator: testConfig.vanillaAuthenticator,
          strategies: [{ index: 0, address: testConfig.vanillaVotingStrategy }],
          executionStrategy: { addy: testConfig.vanillaExecutionStrategy, params: '0x00' },
          metadataUri: 'ipfs://QmNrm6xKuib1THtWkiN5CKtBEerQCDpUtmgDqiaU2xDmca'
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
          proposal: 1,
          choice: 0,
          metadataUri: ''
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
          executionStrategy: { addy: testConfig.vanillaExecutionStrategy, params: '0x00' },
          metadataUri: 'ipfs://QmNrm6xKuib1THtWkiN5CKtBEerQCDpUtmgDqiaU2xDmca'
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
          proposal: 2,
          choice: 0,
          metadataUri: ''
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
          executionStrategy: { addy: testConfig.vanillaExecutionStrategy, params: '0x00' },
          metadataUri: 'ipfs://QmNrm6xKuib1THtWkiN5CKtBEerQCDpUtmgDqiaU2xDmca'
        }
      });

      const res = await ethTxClient.propose({
        signer: manaSigner,
        envelope
      });
      expect(res.hash).toBeDefined();
    });

    it('should vote via authenticator', async () => {
      const envelope = await ethSigClient.vote({
        signer: manaSigner,
        data: {
          space: spaceAddress,
          authenticator: testConfig.ethSigAuthenticator,
          strategies: [{ index: 0, address: testConfig.vanillaVotingStrategy }],
          proposal: 3,
          choice: 0,
          metadataUri: ''
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
          executionStrategy: { addy: testConfig.vanillaExecutionStrategy, params: '0x00' },
          metadataUri: 'ipfs://QmNrm6xKuib1THtWkiN5CKtBEerQCDpUtmgDqiaU2xDmca'
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
          proposal: 4,
          choice: 0,
          metadataUri: ''
        }
      };

      const res = await ethTxClient.vote({
        signer,
        envelope
      });
      expect(res.hash).toBeDefined();
    });
  });

  describe('whitelistVotingStrategy + vanilla authenticator', () => {
    it('should propose via authenticator', async () => {
      const envelope = {
        data: {
          space: spaceAddress,
          authenticator: testConfig.vanillaAuthenticator,
          strategies: [{ index: 2, address: testConfig.whitelistVotingStrategy }],
          executionStrategy: { addy: testConfig.vanillaExecutionStrategy, params: '0x00' },
          metadataUri: 'ipfs://QmNrm6xKuib1THtWkiN5CKtBEerQCDpUtmgDqiaU2xDmca'
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
          strategies: [{ index: 2, address: testConfig.whitelistVotingStrategy }],
          proposal: 5,
          choice: 0,
          metadataUri: ''
        }
      };

      const res = await ethTxClient.vote({
        signer,
        envelope
      });
      expect(res.hash).toBeDefined();
    });
  });

  describe('avatar execution', () => {
    const transactions = [
      {
        to: '0x1ABC7154748D1CE5144478CDEB574AE244B939B5',
        value: 1,
        data: '0x',
        operation: 0,
        nonce: 0
      }
    ];

    it('should propose with avatar', async () => {
      const { executionParams } = getExecutionData(
        testConfig.avatarExecutionStrategy,
        testConfig.networkConfig,
        { transactions }
      );

      const envelope = {
        data: {
          space: spaceAddress,
          authenticator: testConfig.vanillaAuthenticator,
          strategies: [{ index: 0, address: testConfig.vanillaVotingStrategy }],
          executionStrategy: {
            addy: testConfig.avatarExecutionStrategy,
            params: executionParams[0]
          },
          metadataUri: 'ipfs://QmNrm6xKuib1THtWkiN5CKtBEerQCDpUtmgDqiaU2xDmca'
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
          proposal: 6,
          choice: 1,
          metadataUri: ''
        }
      };

      const res = await ethTxClient.vote({
        signer,
        envelope
      });
      expect(res.hash).toBeDefined();
    });

    it('should execute', async () => {
      const { executionParams } = getExecutionData(
        testConfig.avatarExecutionStrategy,
        testConfig.networkConfig,
        { transactions }
      );

      const res = await ethTxClient.execute({
        signer,
        space: spaceAddress,
        proposal: 6,
        executionParams: executionParams[0]
      });
      expect(res.hash).toBeDefined();
    });
  });

  it('should cancel', async () => {
    const res = await ethTxClient.cancel({
      signer,
      space: spaceAddress,
      proposal: PROPOSAL_ID
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

  it('should set voting delay', async () => {
    const res = await ethTxClient.setVotingDelay({ signer, space: spaceAddress, votingDelay: 10 });
    expect(res.hash).toBeDefined();
  });
});
