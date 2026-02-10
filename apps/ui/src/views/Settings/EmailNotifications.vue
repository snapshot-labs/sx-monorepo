<script lang="ts" setup>
import { useQueryClient } from '@tanstack/vue-query';
import { EmailSubscriptionStatus } from '@/helpers/emailNotification/types';
import { clone } from '@/helpers/utils';
import { getValidator } from '@/helpers/validation';
import {
  EMAIL_NOTIFICATION_KEYS,
  useEmailNotificationFeedsListQuery,
  useEmailNotificationQuery
} from '@/queries/emailNotification';

useTitle('Email notifications');

const SUBSCRIBE_FORM_STATE = {
  email: ''
};

const SUBSCRIBE_DEFINITION = {
  $async: true,
  type: 'object',
  title: 'Email subscription',
  additionalProperties: false,
  required: [],
  properties: {
    email: {
      type: 'string',
      format: 'email',
      title: 'Email',
      errorMessage: 'Invalid email address',
      maxLength: 256,
      examples: ['e.g. me@snapshot.box']
    }
  }
};

const { web3 } = useWeb3();
const uiStore = useUiStore();
const queryClient = useQueryClient();

const form = ref<{
  email: string;
}>(clone(SUBSCRIBE_FORM_STATE));
const formErrors = ref<Record<string, any>>({});
const formValidated = ref(false);
const status = ref<EmailSubscriptionStatus>('NOT_SUBSCRIBED');
const feeds = reactive<Record<string, boolean>>({});

const { createSubscription, updateSubscription } = useEmailNotification();

const { 
  data: subscription,
  refetch: refetchSubscription,
  isLoading: isSubscriptionLoading,
  isError: isSubscriptionError 
} = useEmailNotificationQuery(toRef(() => web3.value.account));

const { 
  data: feedsList,
  refetch: refetchFeedsList,
  isLoading: isFeedsListLoading,
  isError: isFeedsListError
} =
  useEmailNotificationFeedsListQuery();

const isFormValid = computed(() => !Object.keys(formErrors.value).length);

async function handleCreateSubscriptionClick() {
  if (!isFormValid.value) return;

  if (await createSubscription(form.value.email)) {
    status.value = 'UNVERIFIED';
  }
}

async function handleUpdateSubscriptionClick() {
  if (await updateSubscription(Object.keys(feeds).filter(key => feeds[key]))) {
    uiStore.addNotification('success', 'Your subscriptions have been updated');

    queryClient.invalidateQueries({
      queryKey: EMAIL_NOTIFICATION_KEYS.user(web3.value.account)
    });
  }
}

const formValidator = getValidator(SUBSCRIBE_DEFINITION);

const refetchDetails = () => {
  refetchSubscription();
  refetchFeedsList();
};

watch(
  [() => feedsList.value, () => isFeedsListLoading.value],
  ([list, loading]) => {
    if (loading || !list) return;

    Object.keys(list).forEach(key => {
      feeds[key] = true;
    });
  },
  { immediate: true }
);

watch(
  [() => isSubscriptionLoading.value, () => isFeedsListLoading.value],
  async () => {
    if (
      isFeedsListLoading.value ||
      isSubscriptionLoading.value ||
      !subscription.value
    ) {
      return;
    }

    Object.keys(feeds).forEach(key => {
      feeds[key] = subscription.value.feeds.includes(key);
    });

    status.value = subscription.value.status;
  },
  { immediate: true }
);

watchEffect(async () => {
  formValidated.value = false;
  formErrors.value = await formValidator.validateAsync(form.value);
  formValidated.value = true;
});
</script>

<template>
  <div>
    <UiSectionHeader label="Email notifications" sticky />
    <div class="p-4 space-y-3 max-w-[640px]">
      <UiLoading
        v-if="web3.authLoading || isSubscriptionLoading || isFeedsListLoading"
      />
      <template v-else-if="status === 'NOT_SUBSCRIBED'">
        <div>
          <h3 class="text-md leading-6">Receive email notifications</h3>
          Stay updated with the latest and important updates directly on your
          inbox.
        </div>
        <div class="s-box">
          <UiInputString
            v-model="form.email"
            class="!mb-0"
            :error="formErrors.email"
            :definition="SUBSCRIBE_DEFINITION.properties.email"
          />
        </div>
        <UiButton
          :disabled="!web3.account || !isFormValid || !formValidated"
          @click="handleCreateSubscriptionClick"
        >
          Subscribe now
        </UiButton>
      </template>
      <template v-else-if="status === 'UNVERIFIED'">
        <div>
          <h3 class="text-md leading-6">Confirm your email</h3>
          <div>
            We've sent an email to your email address.
            <br />
            Please check your inbox and follow the instructions to complete the
            process.
          </div>
        </div>
      </template>
      <template v-else-if="status === 'VERIFIED'">
        <div>
          <h3 class="text-md leading-6">Email notifications</h3>
          Choose the notifications you'd like to receive - and those you don't.
        </div>
        <UiSwitch
          v-for="(feedType, key) in feedsList"
          :key="key"
          v-model="feeds[key]"
          class="gap-2.5 !items-start"
        >
          <div class="space-y-1 leading-[18px]">
            <h4 class="text-base font-normal" v-text="feedType.name" />
            <div class="text-skin-text" v-text="feedType.description" />
          </div>
        </UiSwitch>
        <UiButton @click="handleUpdateSubscriptionClick">
          Update subscriptions
        </UiButton>
      </template>
    </div>
  </div>
</template>
