<script setup lang="ts">
import objectHash from 'object-hash';
import { _d, clone, compareAddresses, shorten } from '@/helpers/utils';
import { evmNetworks, getNetwork, offchainNetworks } from '@/networks';
import {
  GeneratedMetadata,
  StrategyConfig,
  StrategyTemplate
} from '@/networks/types';
import { Space, SpaceMetadata, StrategyParsedMetadata } from '@/types';

const TABS = [
  {
    id: 'profile',
    name: 'Profile'
  },
  {
    id: 'delegations',
    name: 'Delegations'
  },
  {
    id: 'treasuries',
    name: 'Treasuries'
  },
  {
    id: 'authenticators',
    name: 'Authenticators'
  },
  {
    id: 'proposal-validation',
    name: 'Proposal validation'
  },
  {
    id: 'voting-strategies',
    name: 'Voting strategies'
  },
  {
    id: 'voting',
    name: 'Voting'
  },
  {
    id: 'execution',
    name: 'Execution'
  },
  {
    id: 'controller',
    name: 'Controller'
  }
] as const;

const DEFAULT_FORM_STATE: SpaceMetadata = {
  name: '',
  avatar: '',
  cover: '',
  description: '',
  externalUrl: '',
  twitter: '',
  github: '',
  discord: '',
  votingPowerSymbol: '',
  treasuries: [],
  delegations: []
};

const props = defineProps<{ space: Space }>();

const { updateSettings, transferOwnership } = useActions();
const spacesStore = useSpacesStore();
const { web3 } = useWeb3();
const { setTitle } = useTitle();
const uiStore = useUiStore();
const { getDurationFromCurrent, getCurrentFromDuration } = useMetaStore();

const activeTab: Ref<(typeof TABS)[number]['id']> = ref('profile');
const changeControllerModalOpen = ref(false);
const executeFn = ref(save);
const isModified = ref(false);
const loading = ref(true);
const saving = ref(false);
const initialValidationStrategyObjectHash = ref(null as string | null);
const form: Ref<SpaceMetadata> = ref(clone(DEFAULT_FORM_STATE));
const formErrors = ref({} as Record<string, string>);
const authenticators = ref([] as StrategyConfig[]);
const validationStrategy = ref(null as StrategyConfig | null);
const votingStrategies = ref([] as StrategyConfig[]);
const votingDelay: Ref<number | null> = ref(null);
const minVotingPeriod: Ref<number | null> = ref(null);
const maxVotingPeriod: Ref<number | null> = ref(null);
const controller = ref(props.space.controller);

const network = computed(() => getNetwork(props.space.network));
const isController = computed(() =>
  compareAddresses(props.space.controller, web3.value.account)
);

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

  if (!validationStrategy.value) {
    return 'Proposal validation strategy is required';
  }

  return null;
});

watchEffect(async () => {
  isModified.value = false;

  // NOTE: those need to be reassigned there as async watcher won't track changes after await call
  const votingDelayValue = votingDelay.value;
  const minVotingPeriodValue = minVotingPeriod.value;
  const maxVotingPeriodValue = maxVotingPeriod.value;
  const authenticatorsValue = authenticators.value;
  const votingStrategiesValue = votingStrategies.value;
  const validationStrategyValue = validationStrategy.value;
  const initialValidationStrategyObjectHashValue =
    initialValidationStrategyObjectHash.value;

  if (loading.value) {
    isModified.value = false;
    return;
  }

  const initialForm = getInitialForm(props.space);
  if (objectHash(form.value) !== objectHash(initialForm)) {
    isModified.value = true;
    return;
  }

  if (
    votingDelayValue !== null &&
    votingDelayValue !== currentToMinutesOnly(props.space.voting_delay)
  ) {
    isModified.value = true;
    return;
  }

  if (
    minVotingPeriodValue !== null &&
    minVotingPeriodValue !== currentToMinutesOnly(props.space.min_voting_period)
  ) {
    isModified.value = true;
    return;
  }

  if (
    maxVotingPeriodValue !== null &&
    maxVotingPeriodValue !== currentToMinutesOnly(props.space.max_voting_period)
  ) {
    isModified.value = true;
    return;
  }

  const [authenticatorsToAdd, authenticatorsToRemove] = await processChanges(
    authenticatorsValue,
    props.space.authenticators,
    [],
    []
  );

  if (authenticatorsToAdd.length || authenticatorsToRemove.length) {
    isModified.value = true;
    return;
  }

  const [strategiesToAdd, strategiesToRemove] = await processChanges(
    votingStrategiesValue,
    props.space.strategies,
    props.space.strategies_params,
    props.space.strategies_parsed_metadata
  );

  if (strategiesToAdd.length || strategiesToRemove.length) {
    isModified.value = true;
    return;
  }

  const hasValidationStrategyChanged =
    objectHash(validationStrategyValue) !==
    initialValidationStrategyObjectHashValue;
  if (hasValidationStrategyChanged) {
    isModified.value = true;
    return;
  }

  isModified.value = false;
});

function currentToMinutesOnly(value: number) {
  const duration = getDurationFromCurrent(props.space.network, value);
  return Math.round(duration / 60) * 60;
}

function formatCurrentValue(value: number) {
  return _d(currentToMinutesOnly(value));
}

function processParams(paramsArray: string[]) {
  return paramsArray.map(params => (params === '' ? [] : params.split(',')));
}

function processMetadata(
  metadataArray: StrategyParsedMetadata[]
): GeneratedMetadata[] {
  return metadataArray.map(metadata => {
    const result: GeneratedMetadata = {
      name: metadata.name,
      properties: {
        decimals: metadata.decimals,
        symbol: metadata.symbol
      }
    };

    if (metadata.name) result.name = metadata.name;
    if (metadata.description) result.description = metadata.description;
    if (metadata.payload !== null) result.properties.payload = metadata.payload;
    if (metadata.token !== null) result.properties.token = metadata.token;

    return result;
  });
}

async function getInitialStrategiesConfig(
  configured: string[],
  editorStrategies: StrategyTemplate[],
  params?: string[],
  metadata?: StrategyParsedMetadata[]
) {
  const promises = configured.map(async (configuredAddress, i) => {
    const strategy = editorStrategies.find(({ address }) =>
      compareAddresses(address, configuredAddress)
    );

    if (!strategy) return null;

    const resolvedParams =
      strategy.parseParams && params && metadata
        ? await strategy.parseParams(params[i], metadata[i])
        : {};

    return {
      id: crypto.randomUUID(),
      params: resolvedParams,
      ...strategy
    };
  });

  return (await Promise.all(promises)).filter(
    strategy => strategy !== null
  ) as StrategyConfig[];
}

async function getInitialValidationStrategy(
  configuredAddress: string,
  editorStrategies: StrategyTemplate[],
  params: string,
  nestedStrategies: string[],
  nestedStrategiesParams: string[],
  nestedStrategiesMetadata: StrategyParsedMetadata[]
) {
  const strategy = editorStrategies.find(({ address }) =>
    compareAddresses(address, configuredAddress)
  );

  if (!strategy) return null;

  const resolvedParams = strategy.parseParams
    ? await strategy.parseParams(params, null)
    : {};
  const strategies = await getInitialStrategiesConfig(
    nestedStrategies,
    network.value.constants.EDITOR_PROPOSAL_VALIDATION_VOTING_STRATEGIES,
    nestedStrategiesParams,
    nestedStrategiesMetadata
  );

  return {
    id: crypto.randomUUID(),
    params: {
      ...resolvedParams,
      strategies
    },
    ...strategy
  };
}

async function hasStrategyChanged(
  strategy: StrategyConfig,
  previousParams: any,
  previousMetadata: any = {}
) {
  const metadata = strategy.generateMetadata
    ? await strategy.generateMetadata(strategy.params)
    : {};

  if (objectHash(metadata) !== objectHash(previousMetadata)) return true;
  if (strategy.type === 'MerkleWhitelist') {
    // NOTE: MerkleWhitelist params are expensive to compute so we try to skip this step if possible.
    // If metadata has changed then we already know strategy has changed, if metadata is the same
    // we can assume params are the same as well as they use the same source params.
    return false;
  }

  let params: string[] = [];
  if (evmNetworks.includes(props.space.network)) {
    params = strategy.generateParams
      ? strategy.generateParams(strategy.params)
      : ['0x'];
    previousParams = previousParams ?? ['0x'];
  } else {
    params = strategy.generateParams
      ? strategy.generateParams(strategy.params)
      : [];
    previousParams = previousParams ?? [];
  }

  return objectHash(params) !== objectHash(previousParams);
}

async function processChanges(
  editorStrategies: StrategyConfig[],
  currentAddresses: string[],
  params: any[],
  metadata: StrategyParsedMetadata[]
): Promise<[StrategyConfig[], number[]]> {
  const processedParams = processParams(params);
  const processedMetadata = processMetadata(metadata);

  const current = [...currentAddresses];
  const currentStrategiesParams = [...processedParams];
  const currentStrategiesMetadata = [...processedMetadata];
  const toAdd = [] as StrategyConfig[];
  for (const target of editorStrategies) {
    let isInCurrent = false;

    for (const [currentIndex, address] of current.entries()) {
      const matchingStrategy =
        compareAddresses(address, target.address) &&
        !(await hasStrategyChanged(
          target,
          currentStrategiesParams[currentIndex],
          currentStrategiesMetadata[currentIndex]
        ));

      if (matchingStrategy) {
        isInCurrent = true;
        current.splice(currentIndex, 1);
        currentStrategiesParams.splice(currentIndex, 1);
        currentStrategiesMetadata.splice(currentIndex, 1);
        break;
      }
    }

    if (!isInCurrent) toAdd.push(target);
  }

  const target = [...editorStrategies];
  const toRemove = [] as number[];
  for (const [currentIndex, address] of currentAddresses.entries()) {
    let isInTarget = false;

    for (const [targetIndex, strategy] of target.entries()) {
      const matchingStrategy =
        compareAddresses(address, strategy.address) &&
        !(await hasStrategyChanged(
          strategy,
          processedParams[currentIndex],
          processedMetadata[currentIndex]
        ));

      if (matchingStrategy) {
        isInTarget = true;
        target.splice(targetIndex, 1);
        break;
      }
    }

    if (!isInTarget) toRemove.push(currentIndex);
  }

  return [toAdd, toRemove];
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
  if (minVotingPeriod.value) {
    return value >= minVotingPeriod.value;
  }

  return (
    getCurrentFromDuration(props.space.network, value) >=
    props.space.min_voting_period
  );
}

function getInitialForm(space: Space) {
  return {
    name: space.name,
    avatar: space.avatar,
    cover: space.cover,
    description: space.about || '',
    externalUrl: space.external_url,
    github: space.github,
    discord: space.discord,
    twitter: space.twitter,
    votingPowerSymbol: space.voting_power_symbol,
    treasuries: space.treasuries,
    delegations: space.delegations
  };
}

async function reset() {
  formErrors.value = {};
  form.value = getInitialForm(props.space);

  const authenticatorsValue = await getInitialStrategiesConfig(
    props.space.authenticators,
    network.value.constants.EDITOR_AUTHENTICATORS
  );

  const votingStrategiesValue = await getInitialStrategiesConfig(
    props.space.strategies,
    network.value.constants.EDITOR_VOTING_STRATEGIES,
    props.space.strategies_params,
    props.space.strategies_parsed_metadata
  );

  const validationStrategyValue = await getInitialValidationStrategy(
    props.space.validation_strategy,
    network.value.constants.EDITOR_PROPOSAL_VALIDATIONS,
    props.space.validation_strategy_params,
    props.space.voting_power_validation_strategy_strategies,
    props.space.voting_power_validation_strategy_strategies_params,
    props.space.voting_power_validation_strategies_parsed_metadata
  );

  authenticators.value = authenticatorsValue;
  votingStrategies.value = votingStrategiesValue;
  validationStrategy.value = validationStrategyValue;
  votingDelay.value = null;
  minVotingPeriod.value = null;
  maxVotingPeriod.value = null;
  initialValidationStrategyObjectHash.value = objectHash(
    validationStrategyValue
  );
}

async function save() {
  if (!validationStrategy.value) {
    throw new Error('Validation strategy is missing');
  }

  const [authenticatorsToAdd, authenticatorsToRemove] = await processChanges(
    authenticators.value,
    props.space.authenticators,
    [],
    []
  );

  const [strategiesToAdd, strategiesToRemove] = await processChanges(
    votingStrategies.value,
    props.space.strategies,
    props.space.strategies_params,
    props.space.strategies_parsed_metadata
  );

  return updateSettings(
    props.space,
    form.value,
    authenticatorsToAdd,
    authenticatorsToRemove,
    strategiesToAdd,
    strategiesToRemove,
    validationStrategy.value,
    votingDelay.value,
    minVotingPeriod.value,
    maxVotingPeriod.value
  );
}

async function saveController() {
  return transferOwnership(props.space, controller.value);
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

  (event.target as HTMLElement).scrollIntoView();
}

watch(
  () => props.space,
  space => {
    form.value = getInitialForm(space);
  },
  { immediate: true }
);

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
  <div
    v-if="offchainNetworks.includes(space.network)"
    class="px-4 py-3 flex items-center text-skin-link space-x-2"
  >
    <IH-exclamation-circle class="inline-block" />
    <span>Settings are only accessible for onchain spaces.</span>
  </div>
  <template v-else>
    <UiScrollerHorizontal
      class="sticky top-[72px] z-10"
      with-buttons
      gradient="xxl"
    >
      <div class="flex px-4 space-x-3 bg-skin-bg border-b min-w-max">
        <button
          v-for="tab in TABS"
          :key="tab.id"
          type="button"
          class="scroll-mx-8"
          @click="activeTab = tab.id"
          @focus="handleTabFocus"
        >
          <UiLink :is-active="tab.id === activeTab" :text="tab.name" />
        </button>
      </div>
    </UiScrollerHorizontal>
    <div
      class="space-y-4"
      :class="{
        'mx-4 pt-4 max-w-[592px]': activeTab !== 'profile'
      }"
    >
      <UiLoading v-if="loading" />
      <template v-else>
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
            :delegations-value="form.delegations"
            @delegations="v => (form.delegations = v)"
          />
        </UiContainerSettings>
        <UiContainerSettings
          v-if="activeTab === 'treasuries'"
          title="Treasuries"
          description="Treasuries are used to manage the funds of the space."
        >
          <FormSpaceTreasuries
            :treasuries-value="form.treasuries"
            @treasuries="v => (form.treasuries = v)"
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
                  format: 'duration'
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
            <div>
              <div class="s-label !mb-0">Min. voting period</div>
              <UiEditable
                editable
                :initial-value="
                  minVotingPeriod ||
                  currentToMinutesOnly(space.min_voting_period)
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
                      : formatCurrentValue(space.min_voting_period)) ||
                    'No min.'
                  "
                />
              </UiEditable>
            </div>
            <div>
              <div class="s-label !mb-0">Max. voting period</div>
              <UiEditable
                editable
                :initial-value="
                  maxVotingPeriod ||
                  currentToMinutesOnly(space.max_voting_period)
                "
                :definition="{
                  type: 'integer',
                  format: 'duration'
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
        <div
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
        </div>
      </template>
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
</template>
