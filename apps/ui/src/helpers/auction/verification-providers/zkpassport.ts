import { ZKPassport } from '@zkpassport/sdk';
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
        getUrl('bafkreiaucrdvpalghwnvtcczpw5td7ejxj3pna6rtuk6jbzzny3nqdfoba') ||
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

      await context.checkStatus({
        showNotification: true,
        metadata: {
          zkpassport: {
            proofs,
            queryResult
          }
        }
      });
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
  startVerification
};
