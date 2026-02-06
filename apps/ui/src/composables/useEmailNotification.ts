import {
  createSubscription as createEmailSubscription,
  DOMAIN,
  SubscribeSchema
} from '@/helpers/emailNotification';
import { isUserAbortError } from '@/helpers/utils';

type Schema = typeof SubscribeSchema;

export function useEmailNotification() {
  const { auth } = useWeb3();

  async function sign(
    message: Record<string, string>,
    type: Schema
  ): Promise<string> {
    if (!auth.value) throw new Error('Missing user');

    const signer = auth.value.provider.getSigner();

    return signer._signTypedData(DOMAIN, type, message);
  }

  async function createSubscription(email: string): Promise<boolean> {
    if (!auth.value) throw new Error('Missing user');

    const params = {
      address: auth.value.account,
      email
    };

    let signature = '';

    try {
      signature = await sign(params, SubscribeSchema);
    } catch (e) {
      if (isUserAbortError(e)) return false;

      throw e;
    }

    return createEmailSubscription({
      ...params,
      signature
    });
  }

  async function updateSubscription(feeds: string[]) {}

  async function resendVerificationEmail() {}

  return {
    createSubscription,
    updateSubscription,
    resendVerificationEmail
  };
}
