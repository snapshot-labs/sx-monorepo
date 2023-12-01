import { Account, Provider, uint256 } from 'starknet';
import { JsonRpcProvider } from '@ethersproject/providers';
import { Wallet } from '@ethersproject/wallet';
import ozAccountSierra from './fixtures/openzeppelin_Account.sierra.json';
import ozAccountCasm from './fixtures/openzeppelin_Account.casm.json';
import { EthereumSig, EthereumTx, L1Executor, StarknetSig, StarknetTx } from '../../../src/clients';
import { getExecutionData } from '../../../src/executors';
import { Choice } from '../../../src/types';
import { deployDependency, flush, increaseTime, setTime, setup, TestConfig } from './utils';

describe('sx-starknet', () => {
  const ethUrl = 'http://127.0.0.1:8545';
  const entryAddress = '0x7d2f37b75a5e779f7da01c22acee1b66c39e8ba470ee5448f05e1462afcedb4';
  const entryPrivateKey = '0xcd613e30d8f16adf91b7584a2265b1f5';
  const ethPrivateKey = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

  let address = '';
  const publicKey = '0x138b5dd1ca094fcaebd669a5d2aa7bb7d13db32d5939939ee66b938ded2f361';
  const privateKey = '0x9c7d498a8f76dc87564274036988f668';

  // RpcProvider doesn't work with starknet-devnet
  const starkProvider = new Provider({
    sequencer: {
      baseUrl: 'http://127.0.0.1:5050'
    }
  });

  const provider = new JsonRpcProvider(ethUrl);
  const wallet = new Wallet(ethPrivateKey, provider);
  const walletAddress = wallet.address;
  const entryAccount = new Account(starkProvider, entryAddress, entryPrivateKey);
  let account: Account;

  let client: StarknetTx;
  let ethSigClient: EthereumSig;
  let ethTxClient: EthereumTx;
  let starkSigClient: StarknetSig;
  let testConfig: TestConfig;
  let spaceAddress = '';

  beforeAll(async () => {
    setTime(Math.floor(Date.now() / 1000));

    address = await deployDependency(entryAccount, ozAccountSierra, ozAccountCasm, [publicKey]);
    account = new Account(starkProvider, address, privateKey, '1');

    testConfig = await setup({
      starknetProvider: starkProvider as any,
      starknetAccount: account,
      ethereumWallet: wallet,
      ethUrl
    });

    spaceAddress = testConfig.spaceAddress;

    client = new StarknetTx({
      starkProvider: starkProvider as any,
      ethUrl,
      networkConfig: testConfig.networkConfig
    });
    ethSigClient = new EthereumSig({
      starkProvider: starkProvider as any,
      ethUrl,
      networkConfig: testConfig.networkConfig
    });
    ethTxClient = new EthereumTx({
      starkProvider: starkProvider as any,
      ethUrl,
      networkConfig: testConfig.networkConfig,
      sequencerUrl: 'http://127.0.0.1:5050'
    });
    starkSigClient = new StarknetSig({
      starkProvider: starkProvider as any,
      ethUrl,
      networkConfig: testConfig.networkConfig,
      manaUrl: 'http://localhost:3000'
    });
  }, 300_000);

  describe('vanilla authenticator', () => {
    it('StarknetTx.propose()', async () => {
      const envelope = {
        signatureData: {
          address: walletAddress
        },
        data: {
          space: spaceAddress,
          authenticator: testConfig.vanillaAuthenticator,
          strategies: [
            {
              index: 0,
              address: testConfig.vanillaVotingStrategy
            }
          ],
          executionStrategy: {
            addr: testConfig.vanillaExecutionStrategy,
            params: ['0x00']
          },
          metadataUri: 'ipfs://QmNrm6xKuib1THtWkiN5CKtBEerQCDpUtmgDqiaU2xDmca'
        }
      };

      const receipt = await client.propose(account, envelope);
      console.log('Receipt', receipt);

      await starkProvider.waitForTransaction(receipt.transaction_hash);

      expect(receipt.transaction_hash).toBeDefined();
    }, 60_000);

    it('StarknetTx.vote()', async () => {
      const envelope = {
        signatureData: {
          address: walletAddress
        },
        data: {
          space: spaceAddress,
          authenticator: testConfig.vanillaAuthenticator,
          strategies: [
            {
              index: 0,
              address: testConfig.vanillaVotingStrategy
            }
          ],
          proposal: 1,
          choice: Choice.For
        }
      };

      const receipt = await client.vote(account, envelope);
      console.log('Receipt', receipt);

      await starkProvider.waitForTransaction(receipt.transaction_hash);

      expect(receipt.transaction_hash).toBeDefined();
    }, 60_000);
  });

  describe('ethSig authenticator', () => {
    it('StarknetTx.propose()', async () => {
      const data = {
        space: spaceAddress,
        authenticator: testConfig.ethSigAuthenticator,
        strategies: [
          {
            index: 0,
            address: testConfig.vanillaVotingStrategy
          }
        ],
        executionStrategy: {
          addr: testConfig.vanillaExecutionStrategy,
          params: ['0x00']
        },
        metadataUri: 'ipfs://QmNrm6xKuib1THtWkiN5CKtBEerQCDpUtmgDqiaU2xDmca'
      };

      const envelope = await ethSigClient.propose({ signer: wallet, data });

      const receipt = await client.propose(account, envelope);
      console.log('Receipt', receipt);

      await starkProvider.waitForTransaction(receipt.transaction_hash);

      expect(receipt.transaction_hash).toBeDefined();
    }, 60_000);

    it('StarknetTx.vote()', async () => {
      const data = {
        space: spaceAddress,
        authenticator: testConfig.ethSigAuthenticator,
        strategies: [
          {
            index: 0,
            address: testConfig.vanillaVotingStrategy
          }
        ],
        proposal: 2,
        choice: Choice.For
      };

      const envelope = await ethSigClient.vote({ signer: wallet, data });

      const receipt = await client.vote(account, envelope);
      console.log('Receipt', receipt);

      await starkProvider.waitForTransaction(receipt.transaction_hash);

      expect(receipt.transaction_hash).toBeDefined();
    }, 60_000);
  });

  describe('ethTx authenticator', () => {
    it('StarknetTx.propose()', async () => {
      const data = {
        space: spaceAddress,
        authenticator: testConfig.ethTxAuthenticator,
        strategies: [
          {
            index: 0,
            address: testConfig.vanillaVotingStrategy
          }
        ],
        executionStrategy: {
          addr: testConfig.vanillaExecutionStrategy,
          params: ['0x101']
        },
        metadataUri: 'ipfs://QmNrm6xKuib1THtWkiN5CKtBEerQCDpUtmgDqiaU2xDmca'
      };

      await ethTxClient.initializePropose(wallet, data);
      await flush();

      const receipt = await client.propose(account, {
        signatureData: {
          address: walletAddress
        },
        data
      });
      console.log('Receipt', receipt);

      await starkProvider.waitForTransaction(receipt.transaction_hash);

      expect(receipt.transaction_hash).toBeDefined();
    }, 60_000);

    it('StarknetTx.vote()', async () => {
      const data = {
        space: spaceAddress,
        authenticator: testConfig.ethTxAuthenticator,
        strategies: [
          {
            index: 0,
            address: testConfig.vanillaVotingStrategy
          }
        ],
        proposal: 3,
        choice: Choice.For
      };

      await ethTxClient.initializeVote(wallet, data);
      await flush();

      const receipt = await client.vote(account, {
        signatureData: {
          address: walletAddress
        },
        data
      });
      console.log('Receipt', receipt);

      await starkProvider.waitForTransaction(receipt.transaction_hash);

      expect(receipt.transaction_hash).toBeDefined();
    }, 60_000);
  });

  describe('starkSig authenticator', () => {
    it('StarknetTx.propose()', async () => {
      const data = {
        space: spaceAddress,
        authenticator: testConfig.starkSigAuthenticator,
        strategies: [
          {
            index: 0,
            address: testConfig.vanillaVotingStrategy
          }
        ],
        executionStrategy: {
          addr: testConfig.vanillaExecutionStrategy,
          params: ['0x00']
        },
        metadataUri: 'ipfs://QmNrm6xKuib1THtWkiN5CKtBEerQCDpUtmgDqiaU2xDmca'
      };

      const envelope = await starkSigClient.propose({ signer: account, data });

      const receipt = await client.propose(account, envelope);
      console.log('Receipt', receipt);

      await starkProvider.waitForTransaction(receipt.transaction_hash);

      expect(receipt.transaction_hash).toBeDefined();
    }, 60_000);

    it('StarknetTx.vote()', async () => {
      const data = {
        space: spaceAddress,
        authenticator: testConfig.starkSigAuthenticator,
        strategies: [
          {
            index: 0,
            address: testConfig.vanillaVotingStrategy
          }
        ],
        proposal: 4,
        choice: Choice.For
      };

      const envelope = await starkSigClient.vote({ signer: account, data });

      const receipt = await client.vote(account, envelope);
      console.log('Receipt', receipt);

      await starkProvider.waitForTransaction(receipt.transaction_hash);

      expect(receipt.transaction_hash).toBeDefined();
    }, 60_000);
  });

  describe('starkTx authenticator', () => {
    it('StarknetTx.propose()', async () => {
      const envelope = {
        signatureData: {
          address
        },
        data: {
          space: spaceAddress,
          authenticator: testConfig.starkTxAuthenticator,
          strategies: [
            {
              index: 0,
              address: testConfig.vanillaVotingStrategy
            }
          ],
          executionStrategy: {
            addr: testConfig.vanillaExecutionStrategy,
            params: ['0x00']
          },
          metadataUri: 'ipfs://QmNrm6xKuib1THtWkiN5CKtBEerQCDpUtmgDqiaU2xDmca'
        }
      };

      const receipt = await client.propose(account, envelope);
      console.log('Receipt', receipt);

      await starkProvider.waitForTransaction(receipt.transaction_hash);

      expect(receipt.transaction_hash).toBeDefined();
    }, 60_000);

    it('StarknetTx.vote()', async () => {
      const envelope = {
        signatureData: {
          address
        },
        data: {
          space: spaceAddress,
          authenticator: testConfig.starkTxAuthenticator,
          strategies: [
            {
              index: 0,
              address: testConfig.vanillaVotingStrategy
            }
          ],
          proposal: 5,
          choice: Choice.For
        }
      };

      const receipt = await client.vote(account, envelope);
      console.log('Receipt', receipt);

      await starkProvider.waitForTransaction(receipt.transaction_hash);

      expect(receipt.transaction_hash).toBeDefined();
    }, 60_000);
  });

  describe('vanilla authenticator + merkle tree strategy', () => {
    it('StarknetTx.propose()', async () => {
      const envelope = {
        signatureData: {
          address: walletAddress
        },
        data: {
          space: spaceAddress,
          authenticator: testConfig.vanillaAuthenticator,
          strategies: [
            {
              index: 1,
              address: testConfig.merkleWhitelistVotingStrategy,
              metadata: testConfig.merkleWhitelistStrategyMetadata
            }
          ],
          executionStrategy: {
            addr: testConfig.vanillaExecutionStrategy,
            params: ['0x00']
          },
          metadataUri: 'ipfs://QmNrm6xKuib1THtWkiN5CKtBEerQCDpUtmgDqiaU2xDmca'
        }
      };

      const receipt = await client.propose(account, envelope);
      console.log('Receipt', receipt);

      await starkProvider.waitForTransaction(receipt.transaction_hash);

      expect(receipt.transaction_hash).toBeDefined();
    }, 60_000);

    it('StarknetTx.vote()', async () => {
      const envelope = {
        signatureData: {
          address: walletAddress
        },
        data: {
          space: spaceAddress,
          authenticator: testConfig.vanillaAuthenticator,
          strategies: [
            {
              index: 1,
              address: testConfig.merkleWhitelistVotingStrategy,
              metadata: testConfig.merkleWhitelistStrategyMetadata
            }
          ],
          proposal: 6,
          choice: Choice.For
        }
      };

      const receipt = await client.vote(account, envelope);
      console.log('Receipt', receipt);

      await starkProvider.waitForTransaction(receipt.transaction_hash);

      expect(receipt.transaction_hash).toBeDefined();
    }, 60_000);
  });

  describe('vanilla authenticator + erc20Votes strategy', () => {
    it('StarknetTx.propose()', async () => {
      const envelope = {
        signatureData: {
          address
        },
        data: {
          space: spaceAddress,
          authenticator: testConfig.vanillaAuthenticator,
          strategies: [
            {
              index: 2,
              address: testConfig.erc20VotesVotingStrategy
            }
          ],
          executionStrategy: {
            addr: testConfig.vanillaExecutionStrategy,
            params: ['0x00']
          },
          metadataUri: 'ipfs://QmNrm6xKuib1THtWkiN5CKtBEerQCDpUtmgDqiaU2xDmca'
        }
      };

      const receipt = await client.propose(account, envelope);
      console.log('Receipt', receipt);

      await starkProvider.waitForTransaction(receipt.transaction_hash);

      expect(receipt.transaction_hash).toBeDefined();
    }, 60_000);

    it('StarknetTx.vote()', async () => {
      const envelope = {
        signatureData: {
          address
        },
        data: {
          space: spaceAddress,
          authenticator: testConfig.vanillaAuthenticator,
          strategies: [
            {
              index: 2,
              address: testConfig.erc20VotesVotingStrategy
            }
          ],
          proposal: 7,
          choice: Choice.For
        }
      };

      const receipt = await client.vote(account, envelope);
      console.log('Receipt', receipt);

      await starkProvider.waitForTransaction(receipt.transaction_hash);

      expect(receipt.transaction_hash).toBeDefined();
    }, 60_000);
  });

  describe('ethRelayer execution', () => {
    const transactions = [
      {
        to: wallet.address,
        value: 0,
        data: '0x11',
        operation: 0,
        salt: 1n
      }
    ];

    it('should propose with ethRelayer', async () => {
      const { executionParams } = getExecutionData(
        'EthRelayer',
        testConfig.ethRelayerExecutionStrategy,
        { transactions, destination: testConfig.l1AvatarExecutionStrategyContract.address }
      );

      const envelope = {
        data: {
          space: spaceAddress,
          authenticator: testConfig.vanillaAuthenticator,
          strategies: [{ index: 0, address: testConfig.vanillaVotingStrategy }],
          executionStrategy: {
            addr: testConfig.ethRelayerExecutionStrategy,
            params: executionParams
          },
          metadataUri: 'ipfs://QmNrm6xKuib1THtWkiN5CKtBEerQCDpUtmgDqiaU2xDmca'
        }
      };

      const receipt = await client.propose(account, envelope);
      console.log('Receipt', receipt);

      await starkProvider.waitForTransaction(receipt.transaction_hash);

      expect(receipt.transaction_hash).toBeDefined();
    }, 60_000);

    it('should vote via authenticator', async () => {
      const envelope = {
        data: {
          space: spaceAddress,
          authenticator: testConfig.vanillaAuthenticator,
          strategies: [{ index: 0, address: testConfig.vanillaVotingStrategy }],
          proposal: 8,
          choice: 1,
          metadataUri: ''
        }
      };

      const receipt = await client.vote(account, envelope);
      console.log('Receipt', receipt);

      await starkProvider.waitForTransaction(receipt.transaction_hash);

      expect(receipt.transaction_hash).toBeDefined();
    }, 60_000);

    it('should execute', async () => {
      await increaseTime(86400);

      const { executionParams } = getExecutionData(
        'EthRelayer',
        testConfig.ethRelayerExecutionStrategy,
        { transactions, destination: testConfig.l1AvatarExecutionStrategyContract.address }
      );

      const receipt = await client.execute({
        signer: account,
        space: spaceAddress,
        proposalId: 8,
        executionPayload: executionParams
      });
      console.log('Receipt', receipt);

      await starkProvider.waitForTransaction(receipt.transaction_hash);

      expect(receipt.transaction_hash).toBeDefined();
    }, 60_000);

    it('should execute on l1', async () => {
      const flushL2Response = await flush();
      const message_payload = flushL2Response.consumed_messages.from_l2[0].payload;

      const { executionParams } = getExecutionData(
        'EthRelayer',
        testConfig.ethRelayerExecutionStrategy,
        { transactions, destination: testConfig.l1AvatarExecutionStrategyContract.address }
      );

      const executionHash = `${executionParams[2]}${executionParams[1].slice(2)}`;

      const proposal = {
        startTimestamp: message_payload[1],
        minEndTimestamp: message_payload[2],
        maxEndTimestamp: message_payload[3],
        finalizationStatus: message_payload[4],
        executionPayloadHash: message_payload[5],
        executionStrategy: message_payload[6],
        authorAddressType: message_payload[7],
        author: message_payload[8],
        activeVotingStrategies: uint256.uint256ToBN({
          low: message_payload[9],
          high: message_payload[10]
        })
      };
      const votesFor = uint256.uint256ToBN({
        low: message_payload[11],
        high: message_payload[12]
      });
      const votesAgainst = uint256.uint256ToBN({
        low: message_payload[13],
        high: message_payload[14]
      });
      const votesAbstain = uint256.uint256ToBN({
        low: message_payload[15],
        high: message_payload[16]
      });

      const l1ExecutorClient = new L1Executor();
      const res = await l1ExecutorClient.execute({
        signer: wallet,
        executor: testConfig.l1AvatarExecutionStrategyContract.address,
        space: spaceAddress,
        proposal,
        votesFor,
        votesAgainst,
        votesAbstain,
        executionHash,
        transactions
      });

      expect(res.hash).toBeDefined();
    }, 60_000);
  });

  it('should cancel proposal', async () => {
    const res = await client.cancelProposal({
      signer: account,
      space: spaceAddress,
      proposal: 3
    });

    expect(res.transaction_hash).toBeDefined();
  }, 60_000);

  it('should set min voting duration', async () => {
    const res = await client.setMinVotingDuration({
      signer: account,
      space: spaceAddress,
      minVotingDuration: 1
    });

    expect(res.transaction_hash).toBeDefined();
  }, 60_000);

  it('should set max voting duration', async () => {
    const res = await client.setMaxVotingDuration({
      signer: account,
      space: spaceAddress,
      maxVotingDuration: 1
    });

    expect(res.transaction_hash).toBeDefined();
  }, 60_000);

  it('should set voting delay', async () => {
    const res = await client.setVotingDelay({
      signer: account,
      space: spaceAddress,
      votingDelay: 1
    });

    expect(res.transaction_hash).toBeDefined();
  }, 60_000);

  it('should set metadataUri', async () => {
    const res = await client.setMetadataUri({
      signer: account,
      space: spaceAddress,
      metadataUri: ''
    });

    expect(res.transaction_hash).toBeDefined();
  }, 60_000);

  it('should transfer ownership', async () => {
    const res = await client.transferOwnership({
      signer: account,
      space: spaceAddress,
      owner: '0x7d2f37b75a5e779f7da01c22acee1b66c39e8ba470ee5448f05e1462afcedb4'
    });

    expect(res.transaction_hash).toBeDefined();
  }, 60_000);
});
