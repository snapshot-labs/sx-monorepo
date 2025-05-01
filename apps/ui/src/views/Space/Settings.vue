<script setup lang="ts">
import { useQueryClient } from '@tanstack/vue-query';
import { evmNetworks, getNetwork, offchainNetworks } from '@/networks';
import { Space } from '@/types';

const props = defineProps<{ space: Space }>();

defineOptions({ inheritAttrs: false });

const router = useRouter();
const route = useRoute();
const {
  loading,
  isModified,
  isController,
  isOwner,
  isAdmin,
  canModifySettings,
  form,
  formErrors,
  votingDelay,
  minVotingPeriod,
  maxVotingPeriod,
  controller,
  authenticators,
  validationStrategy,
  votingStrategies,
  proposalValidation,
  executionStrategies,
  guidelines,
  template,
  quorumType,
  quorum,
  votingType,
  privacy,
  voteValidation,
  ignoreAbstainVotes,
  snapshotChainId,
  strategies,
  members,
  parent,
  children,
  termsOfServices,
  customDomain,
  isPrivate,
  skinSettings,
  save,
  saveController,
  deleteSpace,
  reset
} = useSpaceSettings(toRef(props, 'space'));
const { invalidateController } = useSpaceController(toRef(props, 'space'));

const queryClient = useQueryClient();
const { setTitle } = useTitle();

const el = ref(null);
const { height: bottomToolbarHeight } = useElementSize(el);

const isAdvancedFormResolved = ref(false);
const hasVotingErrors = ref(false);
const hasProposalErrors = ref(false);
const hasAdvancedErrors = ref(false);

const executeFn = ref(save);
const saving = ref(false);
const customStrategyModalOpen = ref(false);

type Tab = {
  id:
    | 'profile'
    | 'proposal'
    | 'voting-strategies'
    | 'voting'
    | 'members'
    | 'execution'
    | 'authenticators'
    | 'treasuries'
    | 'delegations'
    | 'labels'
    | 'whitelabel'
    | 'advanced'
    | 'controller';
  name: string;
  visible: boolean;
};

const isOffchainNetwork = computed(() =>
  offchainNetworks.includes(props.space.network)
);

const tabs = computed<Tab[]>(
  () =>
    [
      {
        id: 'profile',
        name: 'Profile',
        visible: true
      },
      {
        id: 'proposal',
        name: 'Proposal',
        visible: true
      },
      {
        id: 'voting-strategies',
        name: 'Voting strategies',
        visible: true
      },
      {
        id: 'voting',
        name: 'Voting',
        visible: true
      },
      {
        id: 'members',
        name: 'Members',
        visible: isOffchainNetwork.value
      },
      {
        id: 'execution',
        name: 'Execution',
        visible: !isOffchainNetwork.value
      },
      {
        id: 'authenticators',
        name: 'Authenticators',
        visible: !isOffchainNetwork.value
      },
      {
        id: 'treasuries',
        name: 'Treasuries',
        visible: true
      },
      {
        id: 'delegations',
        name: 'Delegations',
        visible: true
      },
      {
        id: 'labels',
        name: 'Labels',
        visible: true
      },
      {
        id: 'whitelabel',
        name: 'Whitelabel',
        visible: isOffchainNetwork.value
      },
      {
        id: 'advanced',
        name: 'Advanced',
        visible: isOffchainNetwork.value
      },
      {
        id: 'controller',
        name: 'Controller',
        visible: true
      }
    ] as const
);
const activeTab: Ref<Tab['id']> = computed(() => {
  if (route.params.tab && isValidTab(route.params.tab)) {
    return route.params.tab;
  }

  return 'profile';
});
const network = computed(() => getNetwork(props.space.network));

const isTicketValid = computed(() => {
  return !(
    strategies.value.some(s => s.address === 'ticket') &&
    voteValidation.value.name === 'any'
  );
});

const error = computed(() => {
  if (loading.value) {
    return null;
  }
  if (Object.values(formErrors.value).length > 0) {
    return 'Space settings are invalid';
  }

  if (!isOffchainNetwork.value) {
    if (!validationStrategy.value) {
      return 'Proposal validation strategy is required';
    }

    if (!authenticators.value.length) {
      return 'At least one authenticator is required';
    }
  } else {
    if (!strategies.value.length) {
      return 'At least one strategy is required';
    }

    if (!isTicketValid.value) {
      return 'Strategies are invalid';
    }

    if (hasProposalErrors.value) {
      return 'Proposal settings are invalid';
    }

    if (hasVotingErrors.value) {
      return 'Voting settings are invalid';
    }

    if (hasAdvancedErrors.value && isAdvancedFormResolved.value) {
      return 'Advanced settings are invalid';
    }
  }

  return null;
});

const showToolbar = computed(() => {
  return (
    (isModified.value &&
      isAdvancedFormResolved.value &&
      canModifySettings.value) ||
    error.value
  );
});

function isValidTab(param: string | string[]): param is Tab['id'] {
  if (Array.isArray(param)) return false;
  return tabs.value.map(tab => tab.id).includes(param as any);
}

async function reloadSpaceAndReset() {
  await queryClient.invalidateQueries({
    queryKey: ['spaces', 'detail', `${props.space.network}:${props.space.id}`]
  });

  await invalidateController();

  await reset({ force: true });
}

async function handleSettingsSave() {
  saving.value = true;

  if (isOffchainNetwork.value) {
    try {
      await save();
      reloadSpaceAndReset();
    } catch {
    } finally {
      saving.value = false;
    }
  } else {
    executeFn.value = save;
  }
}

function handleControllerSave(value: string) {
  if (!isOwner.value) return;
  controller.value = value;
  saving.value = true;
  executeFn.value = saveController;
}

function handleSpaceDelete() {
  saving.value = true;
  executeFn.value = async () => {
    await deleteSpace();
    router.push({ name: 'my-home' });

    return null;
  };
}

function addCustomStrategy(strategy: { address: string; type: string }) {
  customStrategyModalOpen.value = false;

  executionStrategies.value = [
    ...executionStrategies.value,
    {
      id: crypto.randomUUID(),
      address: strategy.address,
      type: strategy.type,
      generateSummary: () => strategy.type,
      name: 'Custom strategy',
      params: {},
      paramsDefinition: {}
    }
  ];
}

function handleTabFocus(event: FocusEvent) {
  if (!event.target) return;

  (event.target as HTMLElement).scrollIntoView({
    block: 'end'
  });
}

watch(
  () => props.space.controller,
  () => {
    saving.value = false;
  }
);

watchEffect(async () => {
  loading.value = true;

  await reset({ force: true });

  loading.value = false;
});

watchEffect(() => setTitle(`Edit settings - ${props.space.name}`));
</script>

<template>
  <UiScrollerHorizontal
    class="sticky z-40 top-[72px]"
    with-buttons
    gradient="xxl"
  >
    <div class="flex px-4 space-x-3 bg-skin-bg border-b min-w-max">
      <AppLink
        v-for="tab in tabs.filter(tab => tab.visible)"
        :key="tab.id"
        :to="{
          name: 'space-settings',
          params: { space: route.params.space, tab: tab.id }
        }"
        type="button"
        class="scroll-mx-8"
        @focus="handleTabFocus"
      >
        <UiLink :is-active="tab.id === activeTab" :text="tab.name" />
      </AppLink>
    </div>
  </UiScrollerHorizontal>
  <div
    v-bind="$attrs"
    class="!h-auto"
    :style="`min-height: calc(100vh - ${bottomToolbarHeight + 114}px)`"
  >
    <div v-if="loading" class="p-4">
      <UiLoading />
    </div>
    <div
      v-else
      class="flex-grow"
      :class="{ 'px-4 pt-4': activeTab !== 'profile' }"
    >
      <div v-show="activeTab === 'profile'">
        <FormSpaceProfile
          :id="space.id"
          :space="space"
          :form="form"
          @errors="v => (formErrors = v)"
        />
      </div>
      <template v-if="activeTab === 'proposal'">
        <UiContainerSettings
          v-if="isOffchainNetwork"
          title="Proposal"
          description="Set proposal validation to define who can create proposals and provide additional resources for proposal authors."
        >
          <FormSpaceProposal
            v-model:proposal-validation="proposalValidation"
            v-model:guidelines="guidelines"
            v-model:template="template"
            :network-id="space.network"
            :snapshot-chain-id="snapshotChainId"
            :space="space"
            @update-validity="v => (hasProposalErrors = !v)"
          />
        </UiContainerSettings>
        <FormValidation
          v-else
          v-model="validationStrategy"
          :network-id="space.network"
          :available-strategies="network.constants.EDITOR_PROPOSAL_VALIDATIONS"
          :available-voting-strategies="
            network.constants.EDITOR_PROPOSAL_VALIDATION_VOTING_STRATEGIES
          "
          title="Proposal"
          description="Proposal validation strategies are used to determine if a user is allowed to create a proposal."
        />
      </template>
      <template v-if="activeTab === 'voting-strategies'">
        <UiContainerSettings
          v-if="isOffchainNetwork"
          title="Voting strategies"
          description="Voting strategies are sets of conditions used to calculate user's voting power."
        >
          <FormSpaceStrategies
            v-model:snapshot-chain-id="snapshotChainId"
            v-model:strategies="strategies"
            :network-id="space.network"
            :is-ticket-valid="isTicketValid"
            :space="space"
          />
        </UiContainerSettings>
        <FormStrategies
          v-else
          v-model="votingStrategies"
          :network-id="space.network"
          :available-strategies="network.constants.EDITOR_VOTING_STRATEGIES"
          title="Voting strategies"
          description="Voting strategies are customizable contracts used to define how much voting power each user has when casting a vote."
        />
      </template>
      <UiContainerSettings
        v-else-if="activeTab === 'voting'"
        title="Voting"
        description="Set the proposal delay, minimum duration, which is the shortest time needed to execute a proposal if quorum passes, and maximum duration for voting."
      >
        <FormSpaceVoting
          v-model:voting-delay="votingDelay"
          v-model:min-voting-period="minVotingPeriod"
          v-model:max-voting-period="maxVotingPeriod"
          v-model:quorum-type="quorumType"
          v-model:quorum="quorum"
          v-model:voting-type="votingType"
          v-model:privacy="privacy"
          v-model:vote-validation="voteValidation"
          v-model:ignore-abstain-votes="ignoreAbstainVotes"
          :snapshot-chain-id="snapshotChainId"
          :space="space"
          @update-validity="v => (hasVotingErrors = !v)"
        />
      </UiContainerSettings>
      <UiContainerSettings
        v-else-if="activeTab === 'members'"
        title="Members"
        description="Members have different roles and permissions within the space."
      >
        <FormSpaceMembers
          v-model="members"
          :network-id="space.network"
          :is-controller="isController"
          :is-admin="isAdmin"
        />
      </UiContainerSettings>
      <UiContainerSettings
        v-else-if="activeTab === 'execution'"
        title="Execution(s)"
        description="Execution strategies determine if a proposal passes and how it is executed. This section is currently read-only."
      >
        <div class="space-y-3">
          <FormStrategiesStrategyActive
            v-for="strategy in executionStrategies"
            :key="strategy.id"
            read-only
            :network-id="space.network"
            :strategy="strategy"
          />
          <UiButton
            v-if="evmNetworks.includes(space.network)"
            @click="customStrategyModalOpen = true"
          >
            Add custom strategy
          </UiButton>
        </div>
      </UiContainerSettings>
      <FormStrategies
        v-if="activeTab === 'authenticators'"
        v-model="authenticators"
        unique
        :network-id="space.network"
        :available-strategies="network.constants.EDITOR_AUTHENTICATORS"
        title="Authenticators"
        description="Authenticators are customizable contracts that verify user identity for proposing and voting using different methods."
      />
      <UiContainerSettings
        v-if="activeTab === 'treasuries'"
        title="Treasuries"
        description="Treasuries are used to manage the funds of the space."
      >
        <FormSpaceTreasuries
          v-model="form.treasuries"
          :network-id="space.network"
          :limit="isOffchainNetwork ? 10 : undefined"
        />
      </UiContainerSettings>
      <UiContainerSettings
        v-else-if="activeTab === 'delegations'"
        title="Delegations"
        description="Delegations allow users to delegate their voting power to other users."
      >
        <FormSpaceDelegations
          v-model="form.delegations"
          :network-id="space.network"
          :limit="isOffchainNetwork ? 1 : undefined"
        />
      </UiContainerSettings>
      <UiContainerSettings
        v-else-if="activeTab === 'labels'"
        title="Labels"
        description="Labels are used to categorize proposals."
      >
        <FormSpaceLabels v-model="form.labels" />
      </UiContainerSettings>
      <UiContainerSettings
        v-show="activeTab === 'whitelabel'"
        title="Whitelabel"
        description="Customize the appearance of your space to match your brand."
        class="max-w-full"
      >
        <FormSpaceWhitelabel
          v-model:custom-domain="customDomain"
          v-model:skin-settings="skinSettings"
          :space="space"
          @errors="v => (formErrors = v)"
        />
      </UiContainerSettings>
      <UiContainerSettings v-show="activeTab === 'advanced'" title="Advanced">
        <FormSpaceAdvanced
          v-model:parent="parent"
          v-model:children="children"
          v-model:terms-of-services="termsOfServices"
          v-model:is-private="isPrivate"
          :network-id="space.network"
          :space="space"
          :is-controller="isController"
          @delete-space="handleSpaceDelete"
          @update-validity="
            (valid, resolved) => {
              hasAdvancedErrors = !valid;
              isAdvancedFormResolved = resolved;
            }
          "
        />
      </UiContainerSettings>
      <UiContainerSettings
        v-if="activeTab === 'controller'"
        title="Controller"
        description="The controller is the account able to change the space settings and cancel pending proposals."
      >
        <UiMessage v-if="space.id.endsWith('.shib')" type="danger" class="mb-3">
          Controller edition is not available for .shib spaces, and is locked to
          the name's owner
        </UiMessage>
        <UiMessage
          v-else-if="isOffchainNetwork && isController && !isOwner"
          type="danger"
          class="mb-3"
        >
          Controller can only be edited by the ENS owner
        </UiMessage>
        <FormSpaceController
          :controller="controller"
          :network="network"
          :disabled="!isOwner || space.id.endsWith('.shib')"
          @save="handleControllerSave"
        />
      </UiContainerSettings>
    </div>
  </div>
  <UiToolbarBottom v-if="showToolbar" ref="el">
    <div
      class="px-4 py-3 flex flex-col xs:flex-row justify-between items-center"
    >
      <h4
        class="leading-7 font-medium truncate mb-2 xs:mb-0"
        :class="{ 'text-skin-danger': error }"
      >
        {{ error || 'You have unsaved changes' }}
      </h4>
      <div class="flex space-x-3">
        <button type="reset" class="text-skin-heading" @click="reset()">
          Reset
        </button>
        <UiButton
          v-if="!error"
          :loading="saving"
          primary
          @click="handleSettingsSave"
        >
          Save
        </UiButton>
      </div>
    </div>
  </UiToolbarBottom>
  <teleport to="#modal">
    <ModalCustomStrategy
      :open="customStrategyModalOpen"
      :network-id="space.network"
      :chain-id="network.chainId"
      @close="customStrategyModalOpen = false"
      @save="addCustomStrategy"
    />
    <ModalTransactionProgress
      :open="saving && (!isOffchainNetwork || executeFn === saveController)"
      :chain-id="network.chainId"
      :messages="{
        approveTitle: 'Confirm your changes',
        successTitle: 'Done!',
        successSubtitle: 'Your changes were successfully saved'
      }"
      :execute="executeFn"
      @confirmed="
        reloadSpaceAndReset();
        saving = false;
      "
      @close="saving = false"
      @cancelled="saving = false"
    />
  </teleport>
</template>
