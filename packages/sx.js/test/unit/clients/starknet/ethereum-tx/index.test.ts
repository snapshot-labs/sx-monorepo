import { Wallet } from '@ethersproject/wallet';
import { EthereumTx } from '../../../../../src/clients/starknet/ethereum-tx';
import { starkProvider } from '../../../helpers';
import { starknetNetworks, starknetGoerli } from '../../../../../src/networks';

describe('EthereumTx', () => {
  const ethPrivateKey = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

  const ethUrl = process.env.GOERLI_NODE_URL as string;
  const wallet = new Wallet(ethPrivateKey);

  const ethereumTx = new EthereumTx({
    ethUrl,
    starkProvider,
    networkConfig: starknetGoerli
  });

  const { EthTx } = starknetNetworks['sn-tn'].Authenticators;
  const { MerkleWhitelist } = starknetNetworks['sn-tn'].Strategies;

  it('should return propose hash', async () => {
    const data = {
      space: '0x06330d3e48f59f5411c201ee2e9e9ccdc738fb3bb192b0e77e4eda26fa1a22f8',
      authenticator: EthTx,
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
    };

    const result = await ethereumTx.getProposeHash(wallet, data);
    expect(result).toEqual('0x6ad6a7880f1ed8213c56ce9fcc0fc50eaca6fffbbd8546ff211825519bc9032');
  });

  it('should return vote hash', async () => {
    const data = {
      space: '0x06330d3e48f59f5411c201ee2e9e9ccdc738fb3bb192b0e77e4eda26fa1a22f8',
      authenticator: EthTx,
      strategies: [
        {
          index: 0,
          address: MerkleWhitelist
        }
      ],
      proposal: 32,
      choice: 1
    };

    const result = await ethereumTx.getVoteHash(wallet, data);
    expect(result).toEqual('0x4affc1f0108aecdd06a9c2b8402ffe11ba37e27dfcbb98964ff68f83899367b');
  });

  it('should return update proposal hash', async () => {
    const data = {
      space: '0x06330d3e48f59f5411c201ee2e9e9ccdc738fb3bb192b0e77e4eda26fa1a22f8',
      authenticator: EthTx,
      proposal: 32,
      executionStrategy: {
        addr: '0x040de235a2b53e921d37c2ea2b160750ca2e94f01d709f78f870963559de8fbe',
        params: ['0x101']
      },
      metadataUri: 'ipfs://QmNrm6xKuib1THtWkiN5CKtBEerQCDpUtmgDqiaU2xDmca'
    };

    const result = await ethereumTx.getUpdateProposalHash(wallet, data);
    expect(result).toEqual('0x612204abe7ec1f8975360b848882b53578bbc03bf2bac834c9566cc828a2ab4');
  });
});
