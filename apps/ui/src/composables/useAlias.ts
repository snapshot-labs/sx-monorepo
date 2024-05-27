import { Wallet } from '@ethersproject/wallet';
import { getDefaultProvider } from '@ethersproject/providers';
import { isHexString } from '@ethersproject/bytes';
import { enabledNetworks, getNetwork, offchainNetworks } from '@/networks';
import pkg from '../../package.json';

const aliases = useStorage(`${pkg.name}.aliases`, {} as Record<string, string>);

const networkId = offchainNetworks.filter(network => enabledNetworks.includes(network))[0];
const network = getNetwork(networkId);

export function useAlias() {
  const provider = getDefaultProvider();
  const { web3 } = useWeb3();

  async function create(networkCreateActionFn: (address: string) => Promise<unknown>) {
    const newAliasWallet = Wallet.createRandom();

    await networkCreateActionFn(newAliasWallet.address);

    aliases.value = {
      ...aliases.value,
      ...{
        [web3.value.account]: newAliasWallet.privateKey
      }
    };

    return new Wallet(newAliasWallet.privateKey, provider);
  }

  async function existingAliasWallet(privateKey: string) {
    if (!isHexString(privateKey)) return null;

    const registeredAlias = await network.api.loadAlias(
      web3.value.account,
      new Wallet(privateKey, provider).address,
      Math.floor(Date.now() / 1000) - 60 * 60 * 24 * 30
    );

    return registeredAlias ? new Wallet(privateKey, provider) : null;
  }

  async function getAliasWallet(networkCreateActionFn: (address: string) => Promise<unknown>) {
    return (
      (await existingAliasWallet(aliases.value[web3.value.account])) ||
      (await create(networkCreateActionFn))
    );
  }

  return { getAliasWallet };
}
