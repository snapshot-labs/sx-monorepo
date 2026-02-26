import {
  DOMAIN,
  send,
  SubscribeSchema,
  UpdateSubscriptionsSchema
} from '@/helpers/emailNotification';
import {
  EmailSubscriptionMethod,
  EmailSubscriptionParams
} from '@/helpers/emailNotification/types';
import { isUserAbortError } from '@/helpers/utils';

type Schema = typeof SubscribeSchema | typeof UpdateSubscriptionsSchema;

export function useEmailNotification() {
  const { auth } = useWeb3();

  async function _send(
    params: EmailSubscriptionParams,
    schema: Schema,
    method: EmailSubscriptionMethod
  ): Promise<boolean> {
    if (!auth.value) throw new Error('Missing user');

    const allParams = {
      address: auth.value.account,
      ...params
    };

    try {
      const signer = auth.value.provider.getSigner();
      const signature = await signer._signTypedData(DOMAIN, schema, allParams);

      return send(
        {
          ...allParams,
          signature
        },
        method
      );
    } catch (err) {
      if (isUserAbortError(err)) return false;

      throw err;
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

  return {
    createSubscription,
    updateSubscription
  };
}
