import { ZKPassport } from '@zkpassport/sdk';
import { VERIFICATION_PROVIDER_SIGNERS } from '@/helpers/auction';
import { getUrl } from '@/helpers/utils';
import { VerificationContext, VerificationProvider } from './';

let zkPassportInstance: ZKPassport | null = null;

async function getZKPassportInstance() {
  if (!zkPassportInstance) {
    const { ZKPassport } = await import('@zkpassport/sdk');
    zkPassportInstance = new ZKPassport();
  }
  return zkPassportInstance;
}

async function startVerification(context: VerificationContext): Promise<void> {
  context.status.value = 'loading';
  context.error.value = null;

  try {
    const zkPassport = await getZKPassportInstance();

    const queryBuilder = await zkPassport.request({
      name: 'Snapshot auction verification',
      logo:
        getUrl('bafkreigd2gaip56bkg5xt4xkwcpa4uhrlpljg7vsuzumzctte57leh75ra') ||
        '',
      purpose: 'Verify to participate in private auctions',
      scope: 'auction',
      mode: 'fast',
      devMode: context.network === 'sep'
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
    context.status.value = 'pending';
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
        const result = await context.rpcCall<{
          verified: boolean;
          allowListCallData: `0x${string}`;
        }>('verify', {
          auctionId: context.auctionId,
          user: context.web3Account.value,
          provider: 'zkpassport',
          metadata: {
            zkpassport: {
              proofs,
              queryResult
            }
          }
        });

        context.status.value = 'verified';
        context.allowListCallData.value = result.allowListCallData;
        context.addNotification('success', 'ZKPassport verification complete');
      } catch (err) {
        context.handleError(err, 'Failed to verify');
      }
    });

    onReject(() => {
      context.handleError(
        new Error('Verification was rejected'),
        'Verification was rejected'
      );
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
  signer: VERIFICATION_PROVIDER_SIGNERS.zkpassport,
  startVerification
};
