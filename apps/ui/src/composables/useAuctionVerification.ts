import { ComputedRef } from 'vue';
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
  verified: boolean;
  allowListCallData: `0x${string}`;
};

async function rpcCall<T>(method: string, params: object): Promise<T> {
  if (!ATTESTATION_API_URL) {
    throw new Error('ATTESTATION_API_URL is not defined');
  }

  const response = await fetch(ATTESTATION_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method, params })
  });

  const data = await response.json();
  if (data.error) throw new Error(data.error.message);

  return data.result;
}

function parseAuctionNetwork(auctionId: string): string {
  return auctionId.split(':')[0] || '';
}

export function useAuctionVerification({
  auctionId,
  allowListSigner
}: {
  auctionId: ComputedRef<string>;
  allowListSigner: ComputedRef<string>;
}) {
  const { web3Account } = useWeb3();
  const { modalAccountOpen } = useModal();
  const uiStore = useUiStore();

  const network = computed(() => parseAuctionNetwork(auctionId.value));

  const status = ref<VerificationStatus>('loading');
  const verificationUrl = ref<string | null>(null);
  const error = ref<string | null>(null);
  const allowListCallData = ref<`0x${string}` | null>(null);

  const verificationProvider = computed((): AuctionVerificationType => {
    if (!allowListSigner.value) return 'public';

    const provider = getProviderBySigner(allowListSigner.value);
    return provider ? (provider.id as VerificationProviderId) : 'private';
  });

  const isVerified = computed(
    () => verificationProvider.value === 'public' || status.value === 'verified'
  );

  function reset() {
    status.value = 'started';
    verificationUrl.value = null;
    error.value = null;
    allowListCallData.value = null;
  }

  function handleError(err: unknown, message?: string) {
    status.value = 'error';
    error.value =
      err instanceof Error ? err.message : message ?? 'An error occurred';
    uiStore.addNotification('error', error.value);
  }

  async function startVerification() {
    if (!web3Account.value) {
      modalAccountOpen.value = true;
      return;
    }
    if (
      verificationProvider.value === 'public' ||
      verificationProvider.value === 'private'
    ) {
      return;
    }

    const provider = getProvider(verificationProvider.value);
    if (!provider) return;

    const context: VerificationContext = {
      web3Account,
      auctionId: auctionId.value,
      network: network.value,
      status,
      verificationUrl,
      error,
      allowListCallData,
      handleError,
      rpcCall,
      addNotification: uiStore.addNotification
    };

    await provider.startVerification(context);
  }

  async function checkExistingAttestation() {
    if (
      !web3Account.value ||
      status.value === 'loading' ||
      verificationProvider.value === 'public' ||
      verificationProvider.value === 'private'
    ) {
      return;
    }

    const currentAuctionId = auctionId.value;
    const currentProvider = verificationProvider.value;
    const previousStatus = status.value;

    status.value = 'loading';
    try {
      const result = await rpcCall<AttestationResponse>('verify', {
        auctionId: currentAuctionId,
        user: web3Account.value,
        provider: currentProvider
      });

      if (
        auctionId.value !== currentAuctionId ||
        verificationProvider.value !== currentProvider
      ) {
        return;
      }

      status.value = 'verified';
      allowListCallData.value = result.allowListCallData;
    } catch (err) {
      const isExpectedError =
        /Missing proofs or queryResult|Applicant not found/.test(
          (err as Error).message
        );

      if (!isExpectedError) {
        console.error('Attestation check failed', err);
      }

      status.value = previousStatus;
    }
  }

  watch(
    [web3Account, auctionId],
    ([newAccount, newAuctionId], [oldAccount, oldAuctionId]) => {
      const hasAuctionChanged = newAuctionId !== oldAuctionId;
      if (
        hasAuctionChanged ||
        !newAccount ||
        (oldAccount && newAccount !== oldAccount)
      ) {
        reset();
      }

      if (status.value === 'started') {
        checkExistingAttestation();
      }
    },
    { immediate: true }
  );

  return {
    verificationProvider,
    status,
    isVerified,
    verificationUrl,
    error,
    allowListCallData,
    startVerification,
    checkStatus: checkExistingAttestation,
    reset
  };
}
