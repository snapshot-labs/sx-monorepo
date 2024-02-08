import { JsonRpcProvider } from '@ethersproject/providers';
import { Wallet } from '@ethersproject/wallet';
import { starkProvider } from '../../../helpers';
import { EthereumSig } from '../../../../../src/clients/starknet/ethereum-sig';
import { starknetNetworks, starknetGoerli } from '../../../../../src/networks';

describe('EthereumSig', () => {
  const provider = new JsonRpcProvider('https://rpc.brovider.xyz/5');
  const signer = new Wallet(
    '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
    provider
  );

  const client = new EthereumSig({
    starkProvider,
    ethUrl: 'https://rpc.brovider.xyz/5',
    networkConfig: starknetGoerli
  });

  beforeAll(() => {
    jest.spyOn(client, 'generateSalt').mockImplementation(() => '0x0');
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  const { EthSig } = starknetNetworks['sn-tn'].Authenticators;
  const { MerkleWhitelist } = starknetNetworks['sn-tn'].Strategies;

  it('should create propose envelope', async () => {
    const envelope = await client.propose({
      signer,
      data: {
        space: '0x06330d3e48f59f5411c201ee2e9e9ccdc738fb3bb192b0e77e4eda26fa1a22f8',
        authenticator: EthSig,
        strategies: [
          {
            address: MerkleWhitelist,
            index: 0
          }
        ],
        executionStrategy: {
          addr: '0x040de235a2b53e921d37c2ea2b160750ca2e94f01d709f78f870963559de8fbe',
          params: ['0x101']
        },
        metadataUri: 'ipfs://QmNrm6xKuib1THtWkiN5CKtBEerQCDpUtmgDqiaU2xDmca'
      }
    });

    expect(envelope).toMatchSnapshot();
  });

  it('should create update proposal envelope', async () => {
    const envelope = await client.updateProposal({
      signer,
      data: {
        space: '0x06330d3e48f59f5411c201ee2e9e9ccdc738fb3bb192b0e77e4eda26fa1a22f8',
        authenticator: EthSig,
        executionStrategy: {
          addr: '0x040de235a2b53e921d37c2ea2b160750ca2e94f01d709f78f870963559de8fbe',
          params: ['0x101']
        },
        proposal: 1,
        metadataUri: 'ipfs://QmNrm6xKuib1THtWkiN5CKtBEerQCDpUtmgDqiaU2xDmca'
      }
    });

    expect(envelope).toMatchSnapshot();
  });

  it('should create vote envelope', async () => {
    const envelope = await client.vote({
      signer,
      data: {
        space: '0x06330d3e48f59f5411c201ee2e9e9ccdc738fb3bb192b0e77e4eda26fa1a22f8',
        authenticator: EthSig,
        strategies: [
          {
            address: MerkleWhitelist,
            index: 0
          }
        ],
        proposal: 1,
        choice: 1
      }
    });

    expect(envelope).toMatchSnapshot();
  });
});
