<script setup lang="ts">
import { StepRecords } from '@/components/Ui/Stepper.vue';
import { CHAIN_IDS } from '@/helpers/constants';
import { clone } from '@/helpers/utils';
import { getNetwork, metadataNetwork } from '@/networks';
import { StrategyConfig } from '@/networks/types';
import { Member, NetworkID, Validation } from '@/types';

const DEFAULT_SETTINGS_FORM = {
  id: '',
  chainId: CHAIN_IDS['eth'] as number,
  name: '',
  avatar: '',
  cover: '',
  description: '',
  externalUrl: '',
  twitter: '',
  github: '',
  coingecko: '',
  votingPowerSymbol: '',
  categories: [],
  votingDelay: 0,
  minVotingDuration: 0,
  strategies: [] as StrategyConfig[],
  members: [] as Member[],
  proposalValidation: null as Validation | null
};

const DEFAULT_STEP_ERRORS = {
  profile: true,
  voting: false
};

const networkId: NetworkID = metadataNetwork;

type extendedStepRecords = Record<
  keyof StepRecords,
  StepRecords[keyof StepRecords] &
    Partial<{
      contentTitle: string;
      contentDescription: string;
    }>
>;

const STEPS: extendedStepRecords = {
  welcome: {
    title: 'Getting started',
    isValid: () => !web3.value.authLoading,
    contentTitle: 'Getting started',
    contentDescription: 'Create a snapshot space offchain.',
    onBeforeQuit: () => {
      if (web3.value.account) return true;

      modalAccountOpen.value = true;
      return false;
    }
  },
  id: {
    title: 'ENS name',
    isValid: () => !!settingsForm.value.id,
    contentTitle: 'ENS name',
    contentDescription: 'Select your space ENS name.'
  },
  profile: {
    title: 'Profile',
    isValid: () => !stepsErrors.value['profile']
  },
  network: {
    title: 'Network',
    isValid: () => true,
    contentTitle: 'Space network',
    contentDescription: 'Set a base/default network for your space.'
  },
  strategies: {
    title: 'Strategies',
    isValid: () => !!settingsForm.value.strategies.length,
    contentTitle: 'Voting strategies',
    contentDescription:
      "Choose how your users's votes are counted, through a set of strategies."
  },
  proposal: {
    title: 'Proposal validation',
    isValid: () => !!settingsForm.value.proposalValidation,
    contentTitle: 'Proposal validation',
    contentDescription: 'Configure who is allowed to create a proposal.'
  },
  voting: {
    title: 'Voting',
    isValid: () => !stepsErrors.value['voting'],
    contentTitle: 'Voting settings'
  },
  members: {
    title: 'Members',
    isValid: () => true,
    contentTitle: 'Members',
    contentDescription:
      'Assign different roles and permissions to your space members.'
  },
  controller: {
    title: 'Controller',
    isValid: () => true,
    contentTitle: 'Controller',
    contentDescription: "The controller is the space's owner."
  }
} as const;

const { createSpaceRaw } = useActions();
const { web3, authInitiated } = useWeb3();
const router = useRouter();
const { modalAccountOpen } = useModal();
useTitle('Create space');

const sending = ref(false);
const stepsErrors = ref<Record<string, boolean>>(clone(DEFAULT_STEP_ERRORS));

const settingsForm = ref(clone(DEFAULT_SETTINGS_FORM));

const space = computed(() => ({
  turbo: false,
  verified: false,
  network: networkId,
  id: settingsForm.value.id,
  cover: settingsForm.value.cover,
  avatar: settingsForm.value.avatar
}));

const formattedSpaceSettings = computed(() => {
  return {
    name: settingsForm.value.name,
    avatar: settingsForm.value.avatar,
    cover: settingsForm.value.cover,
    about: settingsForm.value.description,
    categories: settingsForm.value.categories,
    website: settingsForm.value.externalUrl,
    twitter: settingsForm.value.twitter,
    github: settingsForm.value.github,
    coingecko: settingsForm.value.coingecko,
    symbol: settingsForm.value.votingPowerSymbol,
    network: String(settingsForm.value.chainId),
    strategies: settingsForm.value.strategies.map(strategy => ({
      name: strategy.name,
      network: String(strategy.chainId ?? settingsForm.value.chainId),
      params: strategy.params
    })),
    voting: {
      delay: settingsForm.value.votingDelay,
      period: settingsForm.value.minVotingDuration,
      privacy: 'any'
    },
    filters: {
      onlyMembers:
        settingsForm.value.proposalValidation?.name === 'only-members'
    },
    voteValidation: settingsForm.value.strategies.find(s => s.name == 'ticket')
      ? {
          name: 'basic',
          params: {
            minScore: 1
          }
        }
      : { name: 'any', params: {} },
    admins: settingsForm.value.members
      .filter(member => member.role === 'admin')
      .map(member => member.address),
    moderators: settingsForm.value.members
      .filter(member => member.role === 'moderator')
      .map(member => member.address),
    members: settingsForm.value.members
      .filter(member => member.role === 'author')
      .map(member => member.address),
    ...(settingsForm.value.proposalValidation?.name === 'only-members' ||
    !settingsForm.value.proposalValidation
      ? {}
      : { validation: settingsForm.value.proposalValidation })
  };
});

async function handleSubmit() {
  const compositeSpaceId = `${networkId}:${settingsForm.value.id}`;

  try {
    sending.value = true;

    await createSpaceRaw(
      networkId,
      settingsForm.value.id,
      JSON.stringify(formattedSpaceSettings.value)
    );

    await router.push({
      name: 'space-overview',
      params: { space: compositeSpaceId }
    });
  } catch (e) {
    console.error('Fail to create space', e);
  } finally {
    sending.value = false;
  }
}

function reset() {
  settingsForm.value = clone(DEFAULT_SETTINGS_FORM);
  stepsErrors.value = clone(DEFAULT_STEP_ERRORS);
}

function handleErrors(stepName: string, errors: any) {
  stepsErrors.value[stepName] = Object.values(errors).length > 0;
}

watch(
  [() => web3.value.account, () => authInitiated.value],
  async ([newAccount, authInitiated], [oldAccount]) => {
    if (!authInitiated) return;

    if (
      (newAccount && oldAccount && newAccount !== oldAccount) ||
      !newAccount
    ) {
      reset();
    }
  },
  { immediate: true }
);
</script>

<template>
  <div class="pt-5 max-w-[50rem] mx-auto px-4">
    <UiStepper :steps="STEPS" :submitting="sending" @submit="handleSubmit">
      <template #content="{ currentStep, goToNext }">
        <UiContainerSettings
          :title="STEPS[currentStep].contentTitle"
          :description="STEPS[currentStep].contentDescription"
        >
          <div v-if="currentStep === 'welcome'" class="space-y-4">
            <div>
              You will be guided through the process of creating a space.
              <br />
              Don't worry, all settings can be changed later.
            </div>
            <div class="border py-3 px-4 rounded-lg flex gap-3">
              <IH-Book-open class="shrink-0 size-[30px]" />
              <div>
                <b>Not sure how to setup your space?</b>
                <br />
                Learn more in the
                <AppLink
                  :to="'https://docs.snapshot.box/user-guides/spaces/create'"
                >
                  documentation
                </AppLink>
                or contact support on
                <AppLink :to="'https://help.snapshot.box/en'">
                  Helpdesk </AppLink
                >.
              </div>
            </div>
          </div>
          <EnsConfiguratorOffchain
            v-if="currentStep === 'id'"
            v-model="settingsForm.id"
            :network-id="networkId"
            @select="goToNext()"
          />
          <FormSpaceProfile
            v-if="currentStep === 'profile'"
            :form="settingsForm"
            :space="space"
            @errors="v => handleErrors('profile', v)"
          />
          <div v-if="currentStep === 'network'" class="s-box mb-4">
            <UiSelectorNetwork
              v-model="settingsForm.chainId"
              :definition="{
                type: 'number',
                title: 'Network',
                tooltip:
                  'Networks can also be specified in individual strategies, delegations, treasuries, etc...',
                examples: ['Select network'],
                networkId: networkId,
                networksListKind: 'offchain'
              }"
            />
          </div>
          <SetupStrategiesConfiguratorOffchain
            v-if="currentStep === 'strategies'"
            v-model="settingsForm.strategies"
            :snapshot-chain-id="settingsForm.chainId"
            :network-id="networkId"
            :space="space"
          />
          <ProposalValidationConfigurator
            v-if="currentStep === 'proposal'"
            v-model="settingsForm.proposalValidation"
            :network-id="networkId"
            :snapshot-chain-id="settingsForm.chainId"
          />
          <template v-if="currentStep === 'voting'">
            <div class="mb-3">
              The voting delay is the time interval between the creation of a
              proposal and the start of voting. The voting period is the
              duration for which the proposal remains open for voting.<br />
              If these values are left empty, the proposal author will be able
              to set them.
            </div>
            <FormVoting
              :form="settingsForm"
              :selected-network-id="networkId"
              @errors="v => handleErrors('voting', v)"
            />
          </template>
          <FormSpaceMembers
            v-if="currentStep === 'members'"
            v-model="settingsForm.members"
            :network-id="networkId"
            :is-controller="true"
            :is-admin="true"
          />
          <template v-if="currentStep === 'controller'">
            <UiMessage type="danger" class="mb-3">
              The controller is set to the ENS name owner. Any change of the ENS
              name ownership will also change the controller.</UiMessage
            >
            <FormSpaceController
              :controller="web3.account"
              :network="getNetwork(networkId)"
              :disabled="true"
            />
          </template>
        </UiContainerSettings>
      </template>
      <template #submit-text> Create space</template>
    </UiStepper>
  </div>
</template>
