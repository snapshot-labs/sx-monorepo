<script setup lang="ts">
import { shorten } from '@/helpers/utils';
import { getNetwork, offchainNetworks } from '@/networks';
import { Space } from '@/types';

const props = defineProps<{ space: Space }>();

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
  quorumType,
  quorum,
  votingType,
  privacy,
  ignoreAbstainVotes,
  snapshotChainId,
  strategies,
  members,
  parent,
  children,
  termsOfServices,
  customDomain,
  isPrivate,
  save,
  saveController,
  deleteSpace,
  reset
} = useSpaceSettings(toRef(props, 'space'));
const spacesStore = useSpacesStore();
const { setTitle } = useTitle();

const hasAdvancedErrors = ref(false);
const hasStrategiesErrors = ref(false);
const changeControllerModalOpen = ref(false);
const executeFn = ref(save);
const saving = ref(false);

type Tab = {
  id:
    | 'profile'
    | 'delegations'
    | 'treasuries'
    | 'strategies'
    | 'authenticators'
    | 'proposal-validation'
    | 'voting-strategies'
    | 'voting'
    | 'members'
    | 'execution'
    | 'controller'
    | 'advanced';
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
        id: 'delegations',
        name: 'Delegations',
        visible: true
      },
      {
        id: 'treasuries',
        name: 'Treasuries',
        visible: true
      },
      {
        id: 'authenticators',
        name: 'Authenticators',
        visible: !isOffchainNetwork.value
      },
      {
        id: 'strategies',
        name: 'Strategies',
        visible: isOffchainNetwork.value
      },
      {
        id: 'proposal-validation',
        name: 'Proposal validation',
        visible: !isOffchainNetwork.value
      },
      {
        id: 'voting-strategies',
        name: 'Voting strategies',
        visible: !isOffchainNetwork.value
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
        id: 'controller',
        name: 'Controller',
        visible: true
      },
      {
        id: 'advanced',
        name: 'Advanced',
        visible: isOffchainNetwork.value
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

const executionStrategies = computed(() => {
  return props.space.executors.map((executor, i) => {
    return {
      id: executor,
      address: executor,
      name:
        network.value.constants.EXECUTORS[executor] ||
        network.value.constants.EXECUTORS[props.space.executors_types[i]] ||
        props.space.executors_types[i],
      params: {},
      paramsDefinition: {}
    };
  });
});

const error = computed(() => {
  if (Object.values(formErrors.value).length > 0) {
    return 'Space profile is invalid';
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

    if (hasStrategiesErrors.value) {
      return 'Strategies are invalid';
    }
  }

  return null;
});

function isValidTab(param: string | string[]): param is Tab['id'] {
  if (Array.isArray(param)) return false;
  return tabs.value.map(tab => tab.id).includes(param as any);
}

async function reloadSpaceAndReset() {
  await spacesStore.fetchSpace(props.space.id, props.space.network);
  await reset({ force: true });
}

function handleSettingsSave() {
  saving.value = true;
  executeFn.value = save;
}

function handleControllerSave(value: string) {
  changeControllerModalOpen.value = false;

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
    class="sticky top-[72px] z-40"
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
  <div v-if="loading" class="p-4">
    <UiLoading />
  </div>
  <div
    v-else
    class="space-y-4 pb-8"
    :class="{
      'mx-4 max-w-[592px]': activeTab !== 'profile'
    }"
  >
    <div v-show="activeTab === 'profile'">
      <FormSpaceProfile
        :id="space.id"
        :space="space"
        :form="form"
        @errors="v => (formErrors = v)"
      />
    </div>
    <UiContainerSettings
      v-if="activeTab === 'delegations'"
      title="Delegations"
      description="Delegations allow users to delegate their voting power to other users."
    >
      <FormSpaceDelegations
        v-model="form.delegations"
        :limit="isOffchainNetwork ? 1 : undefined"
      />
    </UiContainerSettings>
    <UiContainerSettings
      v-if="activeTab === 'treasuries'"
      title="Treasuries"
      description="Treasuries are used to manage the funds of the space."
    >
      <FormSpaceTreasuries
        v-model="form.treasuries"
        :limit="isOffchainNetwork ? 10 : undefined"
      />
    </UiContainerSettings>
    <UiContainerSettings
      v-else-if="activeTab === 'strategies'"
      title="Strategies"
      description="Office ipsum you must be muted. Boy ocean define crank new."
    >
      <FormSpaceStrategies
        v-model:snapshot-chain-id="snapshotChainId"
        v-model:strategies="strategies"
        :network-id="space.network"
        :space="space"
        @update-validity="v => (hasStrategiesErrors = !v)"
      />
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
    <FormValidation
      v-else-if="activeTab === 'proposal-validation'"
      v-model="validationStrategy"
      :network-id="space.network"
      :available-strategies="network.constants.EDITOR_PROPOSAL_VALIDATIONS"
      :available-voting-strategies="
        network.constants.EDITOR_PROPOSAL_VALIDATION_VOTING_STRATEGIES
      "
      title="Proposal validation"
      description="Proposal validation strategies are used to determine if a user is allowed to create a proposal."
    />
    <FormStrategies
      v-else-if="activeTab === 'voting-strategies'"
      v-model="votingStrategies"
      :network-id="space.network"
      :available-strategies="network.constants.EDITOR_VOTING_STRATEGIES"
      title="Voting strategies"
      description="Voting strategies are customizable contracts used to define how much voting power each user has when casting a vote."
    />
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
        v-model:ignore-abstain-votes="ignoreAbstainVotes"
        :space="space"
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
      </div>
    </UiContainerSettings>
    <UiContainerSettings
      v-else-if="activeTab === 'controller'"
      title="Controller"
      description="The controller is the account able to change the space settings and cancel pending proposals."
    >
      <div
        class="flex justify-between items-center rounded-lg border px-4 py-3 text-skin-link"
      >
        <div class="flex flex-col">
          <a
            :href="network.helpers.getExplorerUrl(controller, 'contract')"
            target="_blank"
            class="flex items-center text-skin-text leading-5"
          >
            <UiStamp
              :id="controller"
              type="avatar"
              :size="18"
              class="mr-2 !rounded"
            />
            {{ shorten(controller) }}
            <IH-arrow-sm-right class="-rotate-45" />
          </a>
        </div>
        <button type="button" @click="changeControllerModalOpen = true">
          <IH-pencil />
        </button>
      </div>
      <teleport to="#modal">
        <ModalChangeController
          :open="changeControllerModalOpen"
          :initial-state="{ controller }"
          @close="changeControllerModalOpen = false"
          @save="handleControllerSave"
        />
      </teleport>
    </UiContainerSettings>
    <UiContainerSettings v-show="activeTab === 'advanced'" title="Advanced">
      <FormSpaceAdvanced
        v-model:parent="parent"
        v-model:children="children"
        v-model:terms-of-services="termsOfServices"
        v-model:custom-domain="customDomain"
        v-model:is-private="isPrivate"
        :network-id="space.network"
        :space-id="space.id"
        :is-controller="isController"
        @delete-space="handleSpaceDelete"
        @update-validity="v => (hasAdvancedErrors = !v)"
      />
    </UiContainerSettings>
    <UiToolbarBottom
      v-if="
        (isModified &&
          canModifySettings &&
          !hasAdvancedErrors &&
          !hasStrategiesErrors) ||
        error
      "
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
    </UiToolbarBottom>
  </div>
  <teleport to="#modal">
    <ModalTransactionProgress
      :open="saving"
      :network-id="space.network"
      :messages="{
        approveTitle: 'Confirm your changes',
        successTitle: 'Done!',
        successSubtitle: 'Your changes were successfully saved'
      }"
      :execute="executeFn"
      @confirmed="reloadSpaceAndReset"
      @close="saving = false"
    />
  </teleport>
</template>
