import { isHexString } from '@ethersproject/bytes';
import { Wallet } from '@ethersproject/wallet';
import pkg from '../../package.json';

export function useAliasWallet() {
  const { web3Account: address, auth } = useWeb3();
  const { getAliasSigner } = useActions();
  const { modalAccountOpen } = useModal();

  const storedKeys = useStorage(
    `${pkg.name}.aliases`,
    {} as Record<string, string>
  );
  const isAuthenticating = ref(false);

  const wallet = computed(() => {
    const privateKey = address.value && storedKeys.value[address.value];
    if (!privateKey || !isHexString(privateKey)) return null;

    try {
      return new Wallet(privateKey);
    } catch {
      return null;
    }
  });

  const { isAlreadyAuthorized, isExpired, isCheckingAlias } = useAliasAuthorize(
    () => wallet.value?.address ?? ''
  );

  const isRegistered = computed(
    () => !!wallet.value && isAlreadyAuthorized.value && !isExpired.value
  );

  async function authenticate(): Promise<boolean> {
    if (!auth.value) {
      modalAccountOpen.value = true;
      return false;
    }

    try {
      isAuthenticating.value = true;
      await getAliasSigner(auth.value);
    } catch {
      return false;
    } finally {
      isAuthenticating.value = false;
    }

    return true;
  }

  return {
    wallet,
    isRegistered,
    isCheckingAlias,
    isAuthenticating,
    authenticate
  };
}
