<script lang="ts" setup>
import {
  createSubscription,
  resendVerificationEmail,
  updateSubscription
} from '@/helpers/emailNotification';
import { EmailSubscriptionStatus } from '@/helpers/emailNotification/types';
import { clone } from '@/helpers/utils';
import { getValidator } from '@/helpers/validation';
import {
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
      maxLength: 256,
      examples: ['e.g. me@snapshot.box']
    }
  }
};

const { web3 } = useWeb3();

const form = ref<{
  email: string;
}>(clone(SUBSCRIBE_FORM_STATE));
const formErrors = ref<Record<string, any>>({});
const formValidated = ref(false);
const saving = ref(false);
const el = ref(null);
const { height: bottomToolbarHeight } = useElementSize(el);
const status = ref<EmailSubscriptionStatus>('NOT_SUBSCRIBED');
const feeds = reactive<Record<string, boolean>>({});
const originalFeeds = ref<Record<string, boolean>>({});

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
} = useEmailNotificationFeedsListQuery();

async function handleCreateSubscriptionClick() {
  await createSubscription();
}

async function handleResendConfirmationClick() {
  await resendVerificationEmail();
}

async function handleUpdateSubscriptionClick() {
  saving.value = true;
  try {
    await updateSubscription();
  } finally {
    saving.value = false;
  }
}

const isFeedsModified = computed(() =>
  Object.keys(feeds).some(key => feeds[key] !== originalFeeds.value[key])
);

function resetFeeds() {
  Object.keys(feeds).forEach(key => {
    feeds[key] = originalFeeds.value[key] ?? true;
  });
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

    originalFeeds.value = { ...feeds };
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
  <div
    v-bind="$attrs"
    class="!h-auto p-4"
    :style="`min-height: calc(100vh - ${bottomToolbarHeight + 73}px)`"
  >
    <UiLoading
      v-if="web3.authLoading || isSubscriptionLoading || isFeedsListLoading"
    />
    <div
      v-else-if="isFeedsListError || isSubscriptionError"
      class="max-w-[592px] flex flex-col gap-3 items-start"
    >
      <UiAlert type="error">
        There was an error fetching your subscription details. Please try again.
      </UiAlert>
      <UiButton @click="refetchDetails"> <IH-refresh />Retry </UiButton>
    </div>
    <UiContainerSettings
      v-else-if="status === 'NOT_SUBSCRIBED'"
      title="Receive email notifications"
      description="Stay updated with the latest and important updates directly on your inbox."
    >
      <div class="s-box">
        <UiInputString
          v-model="form.email"
          :error="formErrors.email"
          :definition="SUBSCRIBE_DEFINITION.properties.email"
        />
      </div>
      <UiButton disabled @click="handleCreateSubscriptionClick">
        Subscribe now
      </UiButton>
    </UiContainerSettings>
    <UiContainerSettings
      v-else-if="status === 'UNVERIFIED'"
      title="Confirm your email"
    >
      <template #description>
        We've sent an email to your email address.
        <br />
        Please check your inbox and follow the instructions to complete the
        process.
      </template>
      <UiButton @click="handleResendConfirmationClick">
        Resend confirmation email
      </UiButton>
    </UiContainerSettings>
    <UiContainerSettings
      v-else-if="status === 'VERIFIED'"
      title="Email notifications"
      description="Choose the notifications you'd like to receive - and those you don't."
    >
      <div class="space-y-3 mb-4">
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
      </div>
    </UiContainerSettings>
  </div>
  <SettingsToolbar
    v-if="status === 'VERIFIED' && isFeedsModified"
    ref="el"
    :error="null"
    :is-modified="isFeedsModified"
    :saving="saving"
    @save="handleUpdateSubscriptionClick"
    @reset="resetFeeds"
  />
</template>
