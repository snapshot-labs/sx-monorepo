import { AbiCoder } from '@ethersproject/abi';
import { JsonRpcProvider } from '@ethersproject/providers';
import { Wallet } from '@ethersproject/wallet';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { EthereumSig } from '../../../../../src/clients/evm/ethereum-sig';
import { evmSepolia } from '../../../../../src/evmNetworks';
import { MANA_URL, WHITELIST_SERVER_URL } from '../../../../constants';

describe('EthereumSig', () => {
  const space = '0xef8cd9081d7969c5cdcbb84dd8d577d2daefb649';
  const authenticator = '0xc537d997dDc783E071F82CCBfAa0D768d310001b';
  const executor = '0x6241b5c89350bb3c465179706cf26050ea32444f';

  const provider = new JsonRpcProvider('http://127.0.0.1:8545');
  const signer = new Wallet(
    '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
    provider
  );
  const ethSigClient = new EthereumSig({
    networkConfig: evmSepolia,
    whitelistServerUrl: WHITELIST_SERVER_URL,
    manaUrl: MANA_URL,
    provider
  });

  beforeAll(() => {
    vi.spyOn(ethSigClient, 'generateSalt').mockImplementation(() => 0);
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it('should create propose envelope', async () => {
    const envelope = await ethSigClient.propose({
      signer,
      data: {
        space,
        authenticator,
        strategies: [
          {
            index: 0,
            address: '0xC1245C5DCa7885C73E32294140F1e5d30688c202',
            params: '0x00'
          }
        ],
        executionStrategy: { addr: executor, params: '0x00' },
        metadataUri: 'ipfs://QmNrm6xKuib1THtWkiN5CKtBEerQCDpUtmgDqiaU2xDmca'
      }
    });

    expect(envelope).toMatchSnapshot();
  });

  it('should put the block number before the strategies when proposing at a block', async () => {
    const data = {
      space,
      authenticator,
      strategies: [
        {
          index: 0,
          address: '0xC1245C5DCa7885C73E32294140F1e5d30688c202',
          params: '0x00'
        }
      ],
      executionStrategy: { addr: executor, params: '0x00' },
      metadataUri: 'ipfs://QmNrm6xKuib1THtWkiN5CKtBEerQCDpUtmgDqiaU2xDmca'
    };
    const legacy = await ethSigClient.propose({ signer, data });
    const envelope = await ethSigClient.propose({
      signer,
      data: { ...data, blockNumber: 12345678 }
    });

    // The layout VotingPowerV2 decodes: abi.encode(uint32 blockNumber, IndexedStrategy[])
    const strategiesType = 'tuple(int8 index, bytes params)[]';
    const [blockNumber, userStrategies] = new AbiCoder().decode(
      ['uint32', strategiesType],
      envelope.signatureData!.message.userProposalValidationParams
    );
    expect(blockNumber).toBe(12345678);
    expect(userStrategies).toEqual(
      new AbiCoder().decode(
        [strategiesType],
        legacy.signatureData!.message.userProposalValidationParams
      )[0]
    );

    // 0, the current block, still uses the V2 layout
    const atCurrentBlock = await ethSigClient.propose({
      signer,
      data: { ...data, blockNumber: 0 }
    });
    expect(
      new AbiCoder().decode(
        ['uint32', strategiesType],
        atCurrentBlock.signatureData!.message.userProposalValidationParams
      )[0]
    ).toBe(0);
  });

  it('should create update proposal envelope', async () => {
    const envelope = await ethSigClient.updateProposal({
      signer,
      data: {
        space,
        proposal: 1,
        authenticator,
        executionStrategy: { addr: executor, params: '0x00' },
        metadataUri: 'ipfs://QmNrm6xKuib1THtWkiN5CKtBEerQCDpUtmgDqiaU2xDmca'
      }
    });

    expect(envelope).toMatchSnapshot();
  });

  it('should create vote envelope', async () => {
    const envelope = await ethSigClient.vote({
      signer,
      data: {
        space,
        authenticator,
        strategies: [
          {
            index: 0,
            address: '0xC1245C5DCa7885C73E32294140F1e5d30688c202',
            params: '0x00'
          }
        ],
        proposal: 1,
        choice: 1,
        metadataUri: ''
      }
    });

    expect(envelope).toMatchSnapshot();
  });
});
