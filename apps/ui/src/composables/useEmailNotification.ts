import {
  DOMAIN,
  Method,
  Params,
  send,
  SubscribeSchema,
  UpdateSubscriptionsSchema
} from '@/helpers/emailNotification';
import { isUserAbortError } from '@/helpers/utils';

type Schema = typeof SubscribeSchema | typeof UpdateSubscriptionsSchema;

export function useEmailNotification() {
  const { auth } = useWeb3();

  async function _send(
    params: Params,
    schema: Schema,
    method: Method
  ): Promise<boolean> {
    if (!auth.value) throw new Error('Missing user');

    const allParams = {
      address: auth.value.account,
      ...params
    };

    try {
      const signer = auth.value.provider.getSigner();

      return send(
        {
          ...allParams,
          signature: await signer._signTypedData(DOMAIN, schema, allParams)
        },
        method
      );
    } catch (e) {
      if (isUserAbortError(e)) return false;

      throw e;
    }
  }

  async function createSubscription(email: string): Promise<boolean> {
    return _send({ email }, SubscribeSchema, 'subscribe');
  }

  async function updateSubscription(feeds: string[]): Promise<boolean> {
    return _send(
      { email: '', subscriptions: feeds },
      UpdateSubscriptionsSchema,
      'update'
    );
  }

  async function resendVerificationEmail() {}

  return {
    createSubscription,
    updateSubscription,
    resendVerificationEmail
  };
}
