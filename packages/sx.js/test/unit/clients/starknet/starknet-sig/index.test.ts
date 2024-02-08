import { Account } from 'starknet';
import { starkProvider } from '../../../helpers';
import { StarknetSig } from '../../../../../src/clients/starknet/starknet-sig';
import { starknetNetworks, starknetGoerli } from '../../../../../src/networks';

describe('StarknetSig', () => {
  const address = '0x7d2f37b75a5e779f7da01c22acee1b66c39e8ba470ee5448f05e1462afcedb4';
  const privateKey = '0xcd613e30d8f16adf91b7584a2265b1f5';

  const account = new Account(starkProvider, address, privateKey);

  const client = new StarknetSig({
    starkProvider,
    ethUrl: 'https://rpc.brovider.xyz/5',
    manaUrl: 'http://localhost:3001',
    networkConfig: starknetGoerli
  });

  beforeAll(() => {
    jest.spyOn(client, 'generateSalt').mockImplementation(() => '0x0');
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  const { StarkSig } = starknetNetworks['sn-tn'].Authenticators;
  const { MerkleWhitelist } = starknetNetworks['sn-tn'].Strategies;

  it('should create propose envelope', async () => {
    const envelope = await client.propose({
      signer: account,
      data: {
        space: '0x06330d3e48f59f5411c201ee2e9e9ccdc738fb3bb192b0e77e4eda26fa1a22f8',
        authenticator: StarkSig,
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
      signer: account,
      data: {
        space: '0x06330d3e48f59f5411c201ee2e9e9ccdc738fb3bb192b0e77e4eda26fa1a22f8',
        authenticator: StarkSig,
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
      signer: account,
      data: {
        space: '0x06330d3e48f59f5411c201ee2e9e9ccdc738fb3bb192b0e77e4eda26fa1a22f8',
        authenticator: StarkSig,
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
