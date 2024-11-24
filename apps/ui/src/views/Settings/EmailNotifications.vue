<script lang="ts" setup>
import { clone } from '@/helpers/utils';
import { getValidator } from '@/helpers/validation';
import { EmailSubscriptionType } from '@/types';

useTitle('Email notifications');

const CREATE_SUBSCRIBE_FORM_STATE = {
  email: '',
  subscriptions: []
};

const DEFINITION = {
  $async: true,
  type: 'object',
  title: 'Email subscription',
  additionalProperties: false,
  required: ['email'],
  properties: {
    email: {
      type: 'string',
      format: 'email',
      title: 'Email',
      examples: ['e.g. me@snapshot.box']
    },
    subscriptions: {
      type: 'array',
      title: 'Subscriptions',
      items: {
        type: 'string',
        enum: ['newSummary', 'newProposal', 'closedProposal']
      }
    }
  }
};

const SUBSCRIPTIONS_TYPE = [
  {
    key: 'summary',
    title: 'Weekly summary',
    description:
      'Get a weekly report detailing the activity in your followed spaces.'
  },
  {
    key: 'newProposal',
    title: 'Proposal creation',
    description:
      'Get informed when a new proposal is submitted in your followed spaces.'
  },

  {
    key: 'closedProposal',
    title: 'Proposal closure',
    description:
      'Get informed when a proposal is closed in your followed spaces.'
  }
];

const usersStore = useUsersStore();
const { web3 } = useWeb3();

const user = computed(() => usersStore.getUser(web3.value.account));
const loading = computed(
  () => web3.value.authLoading || usersStore.users[web3.value.account]?.loading
);

const form: Ref<{
  email: string;
  subscriptions: EmailSubscriptionType[];
}> = ref(clone(CREATE_SUBSCRIBE_FORM_STATE));
const subscriptions = reactive<Record<EmailSubscriptionType, boolean>>({
  summary: true,
  newProposal: true,
  closedProposal: true
});
const formErrors = ref({} as Record<string, any>);
const formValidated = ref(false);

function handleCreateSubscribeClick() {}

function handleResendConfirmationClick() {}

function handleUpdateSubscriptionClick() {}

const formValidator = getValidator(DEFINITION);

watch(
  [() => web3.value.account, () => web3.value.authLoading],
  async ([account, loading]) => {
    if (!account || loading) return;

    await usersStore.fetchUser(account);

    if (user.value?.emailSubscription?.subscriptions) {
      Object.keys(subscriptions).forEach(key => {
        subscriptions[key] =
          user.value?.emailSubscription?.subscriptions.includes(
            key as EmailSubscriptionType
          );
      });
    }
  },
  { immediate: true }
);

watchEffect(async () => {
  formValidated.value = false;

  formErrors.value = await formValidator.validateAsync(form);
  formValidated.value = true;
});
</script>

<template>
  <UiLabel label="Email notifications" />
  <div class="p-4 max-w-[640px]">
    <UiLoading v-if="loading" class="block" />
    <template
      v-else-if="!user || user.emailSubscription?.status === 'NOT_SUBSCRIBED'"
    >
      <h3 class="text-md leading-6">Receive email notifications</h3>
      <div class="mb-3">
        Stay updated with the latest and important updates directly on your
        inbox.
      </div>

      <div class="s-box">
        <UiForm
          :error="formErrors"
          :model-value="form"
          :definition="DEFINITION"
        />
        <UiButton @click="handleCreateSubscribeClick">Subscribe now</UiButton>
      </div>
    </template>

    <template v-else-if="user.emailSubscription?.status === 'UNVERIFIED'">
      <h3 class="text-md leading-6">Confirm your email</h3>
      <div class="mb-3">
        We've sent an email to your email address.
        <br />
        Please check your inbox and follow the instructions to complete the
        process.
      </div>
      <UiButton @click="handleResendConfirmationClick">
        Resend confirmation email
      </UiButton>
    </template>
    <template v-else-if="user.emailSubscription?.status === 'VERIFIED'">
      <div class="space-y-3">
        <div>
          <h3 class="text-md leading-6">Email notifications</h3>
          Choose the notifications you'd like to receive - and those you don't.
        </div>

        <UiSwitch
          v-for="type in SUBSCRIPTIONS_TYPE"
          :key="type.key"
          v-model="subscriptions[type.key]"
          class="gap-2.5 !items-start"
        >
          <div class="space-y-1 leading-[18px]">
            <h4 class="text-base font-normal" v-text="type.title" />
            <div class="text-skin-text" v-text="type.description" />
          </div>
        </UiSwitch>

        <UiButton @click="handleUpdateSubscriptionClick">
          Update subscriptions
        </UiButton>
      </div>
    </template>
  </div>
</template>
