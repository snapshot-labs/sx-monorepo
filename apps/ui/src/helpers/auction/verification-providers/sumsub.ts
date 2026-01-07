import { VerificationContext, VerificationProvider } from './index';

async function startVerification(context: VerificationContext): Promise<void> {
  if (!context.checkWalletConnected()) return;

  context.status.value = 'loading';
  context.error.value = null;

  try {
    const result = await context.rpcCall<{ url: string }>('generate_link', {
      bidder: context.web3Account.value,
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
  signer: import.meta.env.VITE_SUMSUB_AUCTION_SIGNER?.toLowerCase() || '',
  startVerification
};
