import { VERIFICATION_PROVIDER_SIGNERS } from '@/helpers/auction';
import { VerificationContext, VerificationProvider } from './';

async function startVerification(context: VerificationContext): Promise<void> {
  context.status.value = 'loading';
  context.error.value = null;

  try {
    const result = await context.rpcCall<{ url: string }>('generate_link', {
      user: context.web3Account.value,
      provider: 'sumsub'
    });

    context.verificationUrl.value = result.url;
    context.status.value = 'pending';
  } catch (err) {
    context.handleError(err, 'Failed to start verification');
  }
}

export const sumsubProvider: VerificationProvider = {
  id: 'sumsub',
  name: 'Sumsub',
  signer: VERIFICATION_PROVIDER_SIGNERS.sumsub,
  startVerification
};
