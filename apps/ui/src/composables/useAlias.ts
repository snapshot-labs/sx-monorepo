import { Wallet } from '@ethersproject/wallet';
import { getDefaultProvider } from '@ethersproject/providers';
import pkg from '../../package.json';
import { enabledNetworks, getNetwork, offchainNetworks } from '@/networks';

const aliases = useStorage(`${pkg.name}.aliases`, {} as Record<string, string>);

const networkId = offchainNetworks.filter(network => enabledNetworks.includes(network))[0];
const network = getNetwork(networkId);

export function useAlias() {
  const { web3 } = useWeb3();

  const wallet = computed(() => {
    const provider = getDefaultProvider();
    const pk = aliases.value[web3.value.account];

    if (!pk) return null;

    return new Wallet(pk, provider);
  });

  async function create(actionFn: (address: string) => Promise<unknown>) {
    const newAliasWallet = Wallet.createRandom();

    await actionFn(newAliasWallet.address);

    aliases.value = {
      ...aliases.value,
      ...{
        [web3.value.account]: newAliasWallet.privateKey
      }
    };
  }

  async function isValid() {
    if (!wallet.value) return false;

    const registeredAlias = await network.api.loadAlias(web3.value.account, wallet.value.address);

    if (!registeredAlias) return false;

    return (
      registeredAlias.address === web3.value.account &&
      registeredAlias.alias === wallet.value.address
    );
  }

  return { wallet, isValid, create };
}
