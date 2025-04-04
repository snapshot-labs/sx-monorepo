import { Account } from 'starknet';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { StarknetSig } from '../../../../../src/clients/starknet/starknet-sig';
import { starknetNetworks, starknetSepolia } from '../../../../../src/networks';
import { starkProvider } from '../../../helpers';

describe('StarknetSig', () => {
  const address =
    '0x7d2f37b75a5e779f7da01c22acee1b66c39e8ba470ee5448f05e1462afcedb4';
  const privateKey = '0xcd613e30d8f16adf91b7584a2265b1f5';

  const account = new Account(starkProvider, address, privateKey);

  const client = new StarknetSig({
    starkProvider,
    networkConfig: starknetSepolia,
    ethUrl: 'https://rpc.brovider.xyz/5',
    manaUrl: 'https://mana.box',
    whitelistServerUrl: 'https://wls.snapshot.box'
  });

  beforeAll(() => {
    vi.spyOn(client, 'generateSalt').mockImplementation(() => '0x0');
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  const { StarkSig } = starknetNetworks['sn-sep'].Authenticators;
  const { MerkleWhitelist } = starknetNetworks['sn-sep'].Strategies;

  it('should create propose envelope', async () => {
    const envelope = await client.propose({
      signer: account,
      data: {
        space:
          '0x06330d3e48f59f5411c201ee2e9e9ccdc738fb3bb192b0e77e4eda26fa1a22f8',
        authenticator: StarkSig,
        strategies: [
          {
            address: MerkleWhitelist,
            index: 0,
            params: '0x'
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
        space:
          '0x06330d3e48f59f5411c201ee2e9e9ccdc738fb3bb192b0e77e4eda26fa1a22f8',
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
        space:
          '0x06330d3e48f59f5411c201ee2e9e9ccdc738fb3bb192b0e77e4eda26fa1a22f8',
        authenticator: StarkSig,
        strategies: [
          {
            address: MerkleWhitelist,
            index: 0,
            params: '0x'
          }
        ],
        metadataUri: 'ipfs://QmNrm6xKuib1THtWkiN5CKtBEerQCDpUtmgDqiaU2xDmca',
        proposal: 1,
        choice: 1
      }
    });

    expect(envelope).toMatchSnapshot();
  });
});
