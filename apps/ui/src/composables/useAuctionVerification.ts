import { getAddress } from '@ethersproject/address';
import { ComputedRef } from 'vue';
import { AuctionNetworkId } from '@/helpers/auction';
import {
  AuctionVerificationType,
  VerificationProviderId,
  VerificationStatus
} from '@/helpers/auction/types';
import {
  PROVIDERS,
  VerificationContext
} from '@/helpers/auction/verification-providers';

const ATTESTATION_API_URL = import.meta.env.VITE_ATTESTATION_URL;

type VerifyResponse = {
  verified: boolean;
  acceptedProviders: VerificationProviderId[];
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

export function useAuctionVerification({
  network,
  auction
}: {
  network: ComputedRef<AuctionNetworkId>;
  auction?: ComputedRef<
    | {
        id: string;
        allowListSigner: string;
        isPrivateAuction: boolean;
      }
    | undefined
  >;
}) {
  const { web3, web3Account } = useWeb3();
  const { modalAccountOpen } = useModal();
  const uiStore = useUiStore();

  const auctionId = computed(() => auction?.value?.id);
  const signer = computed(() =>
    auction?.value?.allowListSigner
      ? getAddress(`0x${auction.value.allowListSigner.slice(-40)}`)
      : null
  );

  const status = ref<VerificationStatus>('loading');
  const verificationUrl = ref<string | null>(null);
  const error = ref<string | null>(null);
  const selectedProviderId = ref<VerificationProviderId | null>(null);
  const acceptedProviders = ref<VerificationProviderId[]>([]);

  const verificationType = computed((): AuctionVerificationType => {
    if (auction?.value && !auction.value.isPrivateAuction) return 'public';
    return acceptedProviders.value[0] ?? 'unknownSigner';
  });

  const activeProviderId = computed(
    (): VerificationProviderId | null =>
      selectedProviderId.value ?? acceptedProviders.value[0] ?? null
  );
  const isVerified = computed(
    () => verificationType.value === 'public' || status.value === 'verified'
  );

  function reset() {
    status.value = 'loading';
    verificationUrl.value = null;
    error.value = null;
    selectedProviderId.value = null;
    acceptedProviders.value = [];
  }

  async function checkStatus(options?: {
    showNotification?: boolean;
    metadata?: object;
  }) {
    const showNotification = options?.showNotification ?? false;
    const provider = activeProviderId.value;

    if (
      !web3Account.value ||
      (auction?.value && !auction.value.isPrivateAuction)
    ) {
      status.value = 'started';
      return;
    }

    status.value = 'loading';

    try {
      const result = await rpcCall<VerifyResponse>('verify', {
        network: network.value,
        user: web3Account.value,
        ...(signer.value && { signer: signer.value }),
        ...(provider && { provider }),
        ...(options?.metadata && { metadata: options.metadata })
      });

      acceptedProviders.value = result.acceptedProviders ?? [];

      if (result.verified) {
        status.value = 'verified';
        if (showNotification) {
          uiStore.addNotification('success', 'Verification complete');
        }
        return;
      }

      status.value = provider ? 'pending' : 'started';
      if (showNotification) {
        uiStore.addNotification(
          'warning',
          'Verification not complete yet. Please complete the verification process.'
        );
      }
    } catch (err) {
      handleError(err, 'Verification check failed');
    }
  }

  function handleError(err: unknown, message?: string) {
    status.value = 'error';
    error.value =
      err instanceof Error ? err.message : message ?? 'An error occurred';
    uiStore.addNotification('error', error.value);
  }

  async function startVerification(providerId?: VerificationProviderId) {
    if (!web3Account.value) {
      modalAccountOpen.value = true;
      return;
    }

    if (
      verificationType.value === 'public' ||
      verificationType.value === 'unknownSigner'
    ) {
      return;
    }

    const targetProviderId = providerId ?? activeProviderId.value;
    if (!targetProviderId) return;

    if (providerId) {
      selectedProviderId.value = providerId;
    }

    const provider = PROVIDERS[targetProviderId];
    if (!provider) return;

    const context: VerificationContext = {
      web3Account,
      network: network.value,
      providerId: targetProviderId,
      status,
      verificationUrl,
      error,
      handleError,
      rpcCall,
      checkStatus
    };

    await provider.startVerification(context);
  }

  async function generateSignature(): Promise<`0x${string}` | undefined> {
    if (
      !web3Account.value ||
      !isVerified.value ||
      verificationType.value === 'public'
    ) {
      return undefined;
    }

    try {
      const result = await rpcCall<{ allowListCallData: `0x${string}` }>(
        'generate_signature',
        {
          network: network.value,
          auctionId: auctionId.value,
          user: web3Account.value,
          signer: signer.value
        }
      );

      return result.allowListCallData;
    } catch (err) {
      handleError(err, 'Failed to generate signature');
      return undefined;
    }
  }

  watch(
    [web3Account, auctionId],
    ([newAccount, newAuctionId], [oldAccount, oldAuctionId]) => {
      if (newAuctionId !== oldAuctionId || oldAccount !== newAccount) {
        reset();
      }

      if (status.value === 'loading') {
        checkStatus();
      }
    },
    { immediate: true }
  );

  return {
    verificationType,
    acceptedProviders,
    activeProviderId,
    status: computed(() => (web3.value.authLoading ? 'loading' : status.value)),
    isVerified,
    verificationUrl,
    error,
    generateSignature,
    startVerification,
    checkStatus: () => checkStatus({ showNotification: true }),
    reset
  };
}
