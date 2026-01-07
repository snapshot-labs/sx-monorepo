import { ZKPassport } from '@zkpassport/sdk';
import { VerificationContext, VerificationProvider } from './index';

let zkPassportInstance: ZKPassport | null = null;

function getZKPassportInstance(): ZKPassport {
  if (!zkPassportInstance) {
    zkPassportInstance = new ZKPassport('snapshot.box');
  }
  return zkPassportInstance;
}

async function startVerification(context: VerificationContext): Promise<void> {
  if (!context.checkWalletConnected()) return;

  context.status.value = 'pending';
  context.error.value = null;

  try {
    const zkPassport = getZKPassportInstance();

    const queryBuilder = await zkPassport.request({
      name: 'Snapshot Auction Verification',
      logo: 'https://snapshot.org/favicon.png',
      purpose: 'Verify to participate in private auctions on Snapshot',
      scope: 'auction',
      mode: 'fast' as const,
      devMode: context.devMode
    });

    queryBuilder.bind(
      'user_address',
      context.web3Account.value as `0x${string}`
    );

    const {
      url,
      onRequestReceived,
      onGeneratingProof,
      onProofGenerated,
      onResult,
      onReject,
      onError
    } = queryBuilder.done();

    context.verificationUrl.value = url;
    const proofs: any[] = [];

    onRequestReceived(() => {
      context.status.value = 'scanning';
    });

    onGeneratingProof(() => {
      context.status.value = 'generating';
    });

    onProofGenerated(proof => {
      proofs.push(proof);
    });

    onResult(async ({ verified, result: queryResult }) => {
      if (!verified) {
        context.status.value = 'rejected';
        context.error.value = 'Verification failed';
        return;
      }

      try {
        await context.rpcCall('verify', {
          network: context.network,
          bidder: context.web3Account.value,
          proofs,
          queryResult,
          devMode: context.devMode
        });

        context.status.value = 'verified';
        context.uiStore.addNotification(
          'success',
          'ZKPassport verification complete'
        );
      } catch (err) {
        context.handleError(err, 'Failed to verify');
      }
    });

    onReject(() => {
      context.status.value = 'rejected';
      context.error.value = 'Verification was rejected';
      context.uiStore.addNotification('error', context.error.value);
    });

    onError(errorMessage => {
      context.handleError(
        typeof errorMessage === 'string'
          ? new Error(errorMessage)
          : errorMessage,
        'Verification failed'
      );
    });
  } catch (err) {
    context.handleError(err, 'Failed to start verification');
  }
}

export const zkpassportProvider: VerificationProvider = {
  id: 'zkpassport',
  name: 'ZKPassport',
  signer: import.meta.env.VITE_ZKPASSPORT_AUCTION_SIGNER?.toLowerCase() || '',
  startVerification
};
