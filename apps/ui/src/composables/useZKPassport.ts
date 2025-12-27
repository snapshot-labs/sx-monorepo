import { ZKPassport } from '@zkpassport/sdk';
import { computed, ref } from 'vue';

const ATTESTATION_URL =
  import.meta.env.VITE_ZKPASSPORT_ATTESTATION_URL ?? 'http://localhost:3002';
const MIN_AGE = 18;

let zkPassportInstance: ZKPassport | null = null;

function getZKPassportInstance(): ZKPassport {
  if (!zkPassportInstance) {
    const domain =
      import.meta.env.VITE_ZKPASSPORT_DOMAIN || window.location.hostname;
    zkPassportInstance = new ZKPassport(domain);
  }
  return zkPassportInstance;
}

export type ZKPassportStatus =
  | 'idle'
  | 'pending'
  | 'scanning'
  | 'generating'
  | 'verified'
  | 'rejected'
  | 'error';

type ZKPassportAttestation = {
  signature: `0x${string}`;
  uniqueIdentifier: string;
  timestamp: number;
};

export function useZKPassport(auctionId: string) {
  const { web3Account } = useWeb3();
  const uiStore = useUiStore();

  const status = ref<ZKPassportStatus>('idle');
  const qrCodeUrl = ref<string | null>(null);
  const attestation = ref<ZKPassportAttestation | null>(null);
  const error = ref<string | null>(null);

  const isVerified = computed(() => status.value === 'verified');
  const isPending = computed(() =>
    ['pending', 'scanning', 'generating'].includes(status.value)
  );

  function handleError(e: unknown, message?: string) {
    status.value = 'error';
    error.value =
      e instanceof Error ? e.message : message || 'An error occurred';
    uiStore.addNotification('error', error.value);
  }

  async function submitAttestation(proofs: any[], queryResult: any) {
    const response = await fetch(`${ATTESTATION_URL}/attest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bidder: web3Account.value,
        auctionId,
        proofs,
        queryResult
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to get attestation');
    }

    return response.json();
  }

  async function startVerification() {
    status.value = 'pending';
    error.value = null;
    attestation.value = null;

    try {
      const zkPassport = getZKPassportInstance();

      const queryBuilder = await zkPassport.request({
        name: 'Snapshot Auction Verification',
        logo: 'https://snapshot.org/favicon.png',
        purpose: 'Verify to participate in private auctions on Snapshot',
        scope: 'auction-adult',
        mode: 'fast' as const,
        devMode: true
      });

      queryBuilder.bind('user_address', web3Account.value as `0x${string}`);

      const {
        url,
        onRequestReceived,
        onGeneratingProof,
        onProofGenerated,
        onResult,
        onReject,
        onError
      } = queryBuilder.gte('age', MIN_AGE).done();

      qrCodeUrl.value = url;

      const proofs: any[] = [];

      onRequestReceived(() => {
        status.value = 'scanning';
      });

      onGeneratingProof(() => {
        status.value = 'generating';
      });

      onProofGenerated(proof => {
        proofs.push(proof);
      });

      onResult(async ({ verified, result: queryResult }) => {
        if (!verified) {
          status.value = 'rejected';
          error.value = 'Verification failed';
          return;
        }

        try {
          attestation.value = await submitAttestation(proofs, queryResult);
          status.value = 'verified';
          uiStore.addNotification(
            'success',
            'ZKPassport verification complete'
          );
        } catch (e) {
          handleError(e, 'Failed to get attestation');
        }
      });

      onReject(() => {
        status.value = 'rejected';
        error.value = 'Verification was rejected';
        uiStore.addNotification('error', error.value);
      });

      onError(errorMessage => {
        handleError(
          typeof errorMessage === 'string'
            ? errorMessage
            : 'Verification failed'
        );
      });
    } catch (e) {
      handleError(e, 'Failed to start verification');
    }
  }

  function reset() {
    status.value = 'idle';
    qrCodeUrl.value = null;
    attestation.value = null;
    error.value = null;
  }

  return {
    status,
    attestation,
    error,
    isVerified,
    isPending,
    qrCodeUrl,
    startVerification,
    reset
  };
}
