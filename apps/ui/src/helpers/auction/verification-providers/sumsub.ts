import { VerificationContext, VerificationProvider } from './';

async function startVerification(context: VerificationContext): Promise<void> {
  context.status.value = 'loading';
  context.error.value = null;

  try {
    const result = await context.rpcCall<{ url: string }>('generate_link', {
      network: context.network,
      user: context.web3Account.value,
      provider: context.providerId,
      auth: context.auth
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
  startVerification
};
