<script setup lang="ts">
import { _d, compareAddresses, shorten } from '@/helpers/utils';
import { getNetwork, offchainNetworks } from '@/networks';
import { Space } from '@/types';

const props = defineProps<{ space: Space }>();

const route = useRoute();
const {
  loading,
  isModified,
  form,
  formErrors,
  votingDelay,
  minVotingPeriod,
  maxVotingPeriod,
  controller,
  authenticators,
  validationStrategy,
  votingStrategies,
  save,
  saveController,
  reset
} = useSpaceSettings(toRef(props, 'space'));
const spacesStore = useSpacesStore();
const { web3 } = useWeb3();
const { setTitle } = useTitle();
const uiStore = useUiStore();
const { getDurationFromCurrent, getCurrentFromDuration } = useMetaStore();

const changeControllerModalOpen = ref(false);
const executeFn = ref(save);
const saving = ref(false);

type Tab = {
  id:
    | 'profile'
    | 'delegations'
    | 'treasuries'
    | 'authenticators'
    | 'proposal-validation'
    | 'voting-strategies'
    | 'voting'
    | 'execution'
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
        id: 'execution',
        name: 'Execution',
        visible: !isOffchainNetwork.value
      },
      {
        id: 'controller',
        name: 'Controller',
        visible: !isOffchainNetwork.value
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
const isController = computed(() => {
  if (isOffchainNetwork.value) return true;

  return compareAddresses(props.space.controller, web3.value.account);
});

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
  }

  return null;
});

function isValidTab(param: string | string[]): param is Tab['id'] {
  if (Array.isArray(param)) return false;
  return tabs.value.map(tab => tab.id).includes(param as any);
}

function currentToMinutesOnly(value: number) {
  const duration = getDurationFromCurrent(props.space.network, value);
  return Math.round(duration / 60) * 60;
}

function formatCurrentValue(value: number) {
  return _d(currentToMinutesOnly(value));
}

function getIsMinVotingPeriodValid(value: number) {
  if (maxVotingPeriod.value) {
    return value <= maxVotingPeriod.value;
  }

  return (
    getCurrentFromDuration(props.space.network, value) <=
    props.space.max_voting_period
  );
}

function getIsMaxVotingPeriodValid(value: number) {
  if (isOffchainNetwork.value) return true;

  if (minVotingPeriod.value) {
    return value >= minVotingPeriod.value;
  }

  return (
    getCurrentFromDuration(props.space.network, value) >=
    props.space.min_voting_period
  );
}

async function reloadSpaceAndReset() {
  await spacesStore.fetchSpace(props.space.id, props.space.network);
  await reset();
}

function handleSettingsSave() {
  saving.value = true;
  executeFn.value = save;
}

function handleControllerSave(value: string) {
  changeControllerModalOpen.value = false;

  if (!isController.value) return;
  controller.value = value;

  saving.value = true;
  executeFn.value = saveController;
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

  await reset();

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
      <router-link
        v-for="tab in tabs.filter(tab => tab.visible)"
        :key="tab.id"
        :to="{
          name: 'space-settings',
          params: { id: route.params.id, tab: tab.id }
        }"
        type="button"
        class="scroll-mx-8"
        @focus="handleTabFocus"
      >
        <UiLink :is-active="tab.id === activeTab" :text="tab.name" />
      </router-link>
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
      <h4 class="eyebrow mb-2 font-medium">Voting</h4>
      <div class="space-y-3">
        <div>
          <div class="s-label !mb-0">Voting delay</div>
          <UiEditable
            editable
            :initial-value="
              votingDelay || currentToMinutesOnly(space.voting_delay)
            "
            :definition="{
              type: 'integer',
              format: 'duration',
              maximum: isOffchainNetwork ? 2592000 : undefined,
              errorMessage: {
                maximum: 'Voting delay must be less than 30 days'
              }
            }"
            @save="value => (votingDelay = Number(value))"
          >
            <h4
              class="text-skin-link text-md"
              v-text="
                (votingDelay !== null
                  ? _d(votingDelay)
                  : formatCurrentValue(space.voting_delay)) || 'No delay'
              "
            />
          </UiEditable>
        </div>
        <div v-if="!isOffchainNetwork">
          <div class="s-label !mb-0">Min. voting period</div>
          <UiEditable
            editable
            :initial-value="
              minVotingPeriod || currentToMinutesOnly(space.min_voting_period)
            "
            :definition="{
              type: 'integer',
              format: 'duration'
            }"
            :custom-error-validation="
              value =>
                !getIsMinVotingPeriodValid(Number(value))
                  ? 'Must be equal to or lower than max. voting period'
                  : undefined
            "
            @save="value => (minVotingPeriod = Number(value))"
          >
            <h4
              class="text-skin-link text-md"
              v-text="
                (minVotingPeriod !== null
                  ? _d(minVotingPeriod)
                  : formatCurrentValue(space.min_voting_period)) || 'No min.'
              "
            />
          </UiEditable>
        </div>
        <div>
          <div class="s-label !mb-0">
            {{ isOffchainNetwork ? 'Voting period' : 'Max. voting period' }}
          </div>
          <UiEditable
            editable
            :initial-value="
              maxVotingPeriod || currentToMinutesOnly(space.max_voting_period)
            "
            :definition="{
              type: 'integer',
              format: 'duration',
              maximum: isOffchainNetwork ? 15552000 : undefined,
              errorMessage: {
                maximum: 'Voting period must be less than 180 days'
              }
            }"
            :custom-error-validation="
              value =>
                !getIsMaxVotingPeriodValid(Number(value))
                  ? 'Must be equal to or higher than min. voting period'
                  : undefined
            "
            @save="value => (maxVotingPeriod = Number(value))"
          >
            <h4
              class="text-skin-link text-md"
              v-text="
                (maxVotingPeriod !== null
                  ? _d(maxVotingPeriod)
                  : formatCurrentValue(space.max_voting_period)) || '0m'
              "
            />
          </UiEditable>
        </div>
      </div>
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
    <footer
      v-if="!uiStore.sidebarOpen && ((isModified && isController) || error)"
      class="fixed bg-skin-bg bottom-0 left-0 right-0 lg:left-[312px] xl:right-[240px] border-y px-4 py-3 flex flex-col xs:flex-row justify-between items-center"
    >
      <h4
        class="leading-7 font-medium truncate mb-2 xs:mb-0"
        :class="{ 'text-skin-danger': error }"
      >
        {{ error || 'You have unsaved changes' }}
      </h4>
      <div class="flex space-x-3">
        <button type="reset" class="text-skin-heading" @click="reset">
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
    </footer>
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
