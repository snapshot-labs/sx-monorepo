import { isHexString } from '@ethersproject/bytes';
import { getDefaultProvider } from '@ethersproject/providers';
import { Wallet } from '@ethersproject/wallet';
import { getNetwork, metadataNetwork } from '@/networks';
import pkg from '../../package.json';

const ALIAS_AVAILABILITY_PERIOD = 60 * 60 * 24 * 30; // 30 days
const ALIAS_AVAILABILITY_BUFFER = 60 * 5; // 5 minutes

const aliases = useStorage(`${pkg.name}.aliases`, {} as Record<string, string>);

const network = getNetwork(metadataNetwork);

export function useAlias() {
  const provider = getDefaultProvider();
  const { web3 } = useWeb3();

  async function create(
    networkCreateActionFn: (address: string) => Promise<unknown>
  ) {
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

  async function getExistingAliasWallet(privateKey: string) {
    if (!isHexString(privateKey)) return null;

    const registeredAlias = await network.api.loadAlias(
      web3.value.account,
      new Wallet(privateKey, provider).address,
      Math.floor(Date.now() / 1000) -
        ALIAS_AVAILABILITY_PERIOD +
        ALIAS_AVAILABILITY_BUFFER
    );

    return registeredAlias ? new Wallet(privateKey, provider) : null;
  }

  async function getAliasWallet(
    networkCreateActionFn: (address: string) => Promise<unknown>
  ) {
    return (
      (await getExistingAliasWallet(aliases.value[web3.value.account])) ||
      (await create(networkCreateActionFn))
    );
  }

  return { getAliasWallet };
}
