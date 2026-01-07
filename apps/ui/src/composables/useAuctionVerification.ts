import { computed, ref, watch } from 'vue';
import {
  AuctionVerificationType,
  VerificationProviderId,
  VerificationStatus
} from '@/helpers/auction/types';
import {
  getProvider,
  getProviderBySigner,
  VerificationContext
} from '@/helpers/auction/verification-providers';

const ATTESTATION_API_URL = import.meta.env.VITE_ATTESTATION_URL;

type AttestationResponse = {
  allowListCallData: `0x${string}`;
};

let rpcId = 1;

async function rpcCall<T>(method: string, params: object): Promise<T> {
  if (!ATTESTATION_API_URL) {
    throw new Error('ATTESTATION_API_URL is not defined');
  }

  const response = await fetch(ATTESTATION_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: rpcId++, method, params })
  });

  const data = await response.json();
  if (data.error) throw new Error(data.error.message);

  return data.result;
}

export function useAuctionVerification(
  auctionId: string,
  allowListSigner: string
) {
  const { web3Account } = useWeb3();
  const { modalAccountOpen } = useModal();
  const uiStore = useUiStore();

  const networkParts = auctionId.split(':');
  const network = networkParts[0] || '';
  const devMode = network === 'sep';

  const status = ref<VerificationStatus>('start');
  const verificationUrl = ref<string | null>(null);
  const error = ref<string | null>(null);
  const isCheckingStatus = ref(false);

  const verificationType = computed((): AuctionVerificationType => {
    const signer = allowListSigner;
    if (!signer) return 'public';

    const provider = getProviderBySigner(signer);
    return provider ? (provider.id as VerificationProviderId) : 'private';
  });

  const isVerified = computed(
    () => verificationType.value === 'public' || status.value === 'verified'
  );

  function reset() {
    status.value = 'start';
    verificationUrl.value = null;
    error.value = null;
  }

  function handleError(err: unknown, message?: string) {
    status.value = 'error';
    error.value =
      err instanceof Error ? err.message : message ?? 'An error occurred';
    uiStore.addNotification('error', error.value);
  }

  function checkWalletConnected(): boolean {
    if (!web3Account.value) {
      modalAccountOpen.value = true;
      return false;
    }
    return true;
  }

  async function startVerification() {
    const provider = getProvider(verificationType.value);
    if (!provider) return;

    const context: VerificationContext = {
      web3Account,
      network,
      devMode,
      status,
      verificationUrl,
      error,
      handleError,
      checkWalletConnected,
      rpcCall,
      uiStore
    };

    await provider.startVerification(context);
  }

  async function getAttestation(): Promise<`0x${string}` | undefined> {
    if (!web3Account.value) return;

    try {
      const result = await rpcCall<AttestationResponse>('get_attestation', {
        auctionId,
        bidder: web3Account.value,
        provider: verificationType.value
      });

      status.value = 'verified';
      return result.allowListCallData;
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : 'Failed to get attestation';
      error.value = errorMsg;
      throw new Error(errorMsg);
    }
  }

  async function checkExistingAttestation() {
    if (!web3Account.value) return;

    isCheckingStatus.value = true;
    try {
      await getAttestation();
    } catch {
    } finally {
      isCheckingStatus.value = false;
    }
  }

  watch(
    web3Account,
    (newAccount, oldAccount) => {
      if (!newAccount || (oldAccount && newAccount !== oldAccount)) {
        reset();
        if (!newAccount) return;
      }

      if (status.value === 'start') {
        checkExistingAttestation();
      }
    },
    { immediate: true }
  );

  return {
    verificationType,
    status,
    isVerified,
    isCheckingStatus,
    verificationUrl,
    error,
    startVerification,
    getAttestation,
    checkStatus: checkExistingAttestation,
    reset
  };
}
