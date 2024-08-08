<script setup lang="ts">
import objectHash from 'object-hash';
import { _d, compareAddresses, getUrl, shorten } from '@/helpers/utils';
import { evmNetworks, getNetwork } from '@/networks';
import {
  GeneratedMetadata,
  StrategyConfig,
  StrategyTemplate
} from '@/networks/types';
import { Space, StrategyParsedMetadata } from '@/types';

const TABS = [
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

const props = defineProps<{ space: Space }>();

const { updateSettings, transferOwnership } = useActions();
const { web3 } = useWeb3();
const { setTitle } = useTitle();
const uiStore = useUiStore();
const { getDurationFromCurrent, getCurrentFromDuration } = useMetaStore();

const activeTab: Ref<(typeof TABS)[number]['id']> = ref('authenticators');
const changeControllerModalOpen = ref(false);
const valuesChanged = ref(false);
const loading = ref(true);
const saving = ref(false);
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

const isModified = computedAsync(async () => {
  try {
    if (loading.value) return false;

    if (
      votingDelay.value &&
      votingDelay.value !== currentToMinutesOnly(props.space.voting_delay)
    ) {
      return true;
    }

    if (
      minVotingPeriod.value &&
      minVotingPeriod.value !==
        currentToMinutesOnly(props.space.min_voting_period)
    ) {
      return true;
    }

    if (
      maxVotingPeriod.value &&
      maxVotingPeriod.value !==
        currentToMinutesOnly(props.space.max_voting_period)
    ) {
      return true;
    }

    // NOTE: those need to be reassigned there as computedAsync won't track changes after await call
    const authenticatorsValue = authenticators.value;
    const votingStrategiesValue = votingStrategies.value;
    const validationStrategyValue = validationStrategy.value;

    const [authenticatorsToAdd, authenticatorsToRemove] = await processChanges(
      authenticatorsValue,
      props.space.authenticators,
      [],
      []
    );

    if (authenticatorsToAdd.length || authenticatorsToRemove.length) {
      return true;
    }

    const [strategiesToAdd, strategiesToRemove] = await processChanges(
      votingStrategiesValue,
      props.space.strategies,
      props.space.strategies_params,
      props.space.strategies_parsed_metadata
    );

    if (strategiesToAdd.length || strategiesToRemove.length) {
      return true;
    }

    const isUnhandledValidationStrategy =
      !validationStrategyValue ||
      validationStrategyValue.type !== 'VotingPower';

    if (isUnhandledValidationStrategy) {
      return true;
    }

    const rebuiltMetadata = {
      strategies_metadata:
        props.space.voting_power_validation_strategies_parsed_metadata.map(
          v => `ipfs://${v.id}`
        )
    };
    const hasValidationStrategyChanged = await hasStrategyChanged(
      validationStrategyValue,
      [props.space.validation_strategy_params],
      rebuiltMetadata
    );
    if (hasValidationStrategyChanged) return true;

    return false;
  } finally {
    valuesChanged.value = false;
  }
}, false);

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
  let params;
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

  const metadata = strategy.generateMetadata
    ? await strategy.generateMetadata(strategy.params)
    : {};

  return (
    objectHash(params) !== objectHash(previousParams) ||
    objectHash(metadata) !== objectHash(previousMetadata)
  );
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

async function reset() {
  authenticators.value = await getInitialStrategiesConfig(
    props.space.authenticators,
    network.value.constants.EDITOR_AUTHENTICATORS
  );

  votingStrategies.value = await getInitialStrategiesConfig(
    props.space.strategies,
    network.value.constants.EDITOR_VOTING_STRATEGIES,
    props.space.strategies_params,
    props.space.strategies_parsed_metadata
  );

  validationStrategy.value = await getInitialValidationStrategy(
    props.space.validation_strategy,
    network.value.constants.EDITOR_PROPOSAL_VALIDATIONS,
    props.space.validation_strategy_params,
    props.space.voting_power_validation_strategy_strategies,
    props.space.voting_power_validation_strategy_strategies_params,
    props.space.voting_power_validation_strategies_parsed_metadata
  );

  votingDelay.value = null;
  minVotingPeriod.value = null;
  maxVotingPeriod.value = null;
}

async function save() {
  if (!validationStrategy.value) return;

  saving.value = true;

  try {
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

    await updateSettings(
      props.space,
      authenticatorsToAdd,
      authenticatorsToRemove,
      strategiesToAdd,
      strategiesToRemove,
      validationStrategy.value,
      votingDelay.value,
      minVotingPeriod.value,
      maxVotingPeriod.value
    );
  } finally {
    saving.value = false;
  }
}

async function handleControllerSave(value: string) {
  changeControllerModalOpen.value = false;

  await transferOwnership(props.space, value);
  controller.value = value;
}

watch(
  () => [
    authenticators.value,
    votingStrategies.value,
    validationStrategy.value,
    votingDelay.value,
    minVotingPeriod.value,
    maxVotingPeriod.value
  ],
  () => {
    valuesChanged.value = true;
  },
  { deep: true }
);

watchEffect(async () => {
  loading.value = true;

  await reset();

  loading.value = false;
});

watchEffect(() => setTitle(`Edit settings - ${props.space.name}`));
</script>

<template>
  <div v-if="!isController" class="px-4 py-3">
    Only controller can modify space settings.
  </div>
  <template v-else>
    <div
      class="overflow-y-scroll no-scrollbar z-40 sticky top-[71px] lg:top-[72px]"
    >
      <div class="flex px-4 space-x-3 bg-skin-bg border-b min-w-max">
        <button
          v-for="tab in TABS"
          :key="tab.id"
          type="button"
          @click="activeTab = tab.id"
        >
          <UiLink :is-active="tab.id === activeTab" :text="tab.name" />
        </button>
      </div>
    </div>
    <div class="space-y-4 mx-4 pt-4">
      <UiLoading v-if="loading" />
      <template v-else>
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
        <div v-else-if="activeTab === 'voting'" class="mb-4">
          <h3 class="text-md leading-6">Voting</h3>
          <span class="mb-4 inline-block">Placeholder description</span>
          <h4 class="eyebrow mb-2 font-medium">Voting</h4>
          <div class="space-y-3">
            <div>
              <div class="s-label !mb-0">Voting delay</div>
              <UiEditable
                editable
                :initial-value="currentToMinutesOnly(space.voting_delay)"
                :definition="{
                  type: 'integer',
                  format: 'duration'
                }"
                @save="value => (votingDelay = Number(value))"
              >
                <h4
                  class="text-skin-link text-md"
                  v-text="
                    votingDelay
                      ? _d(votingDelay)
                      : formatCurrentValue(space.voting_delay) || 'No delay'
                  "
                />
              </UiEditable>
            </div>
            <div>
              <div class="s-label !mb-0">Min. voting period</div>
              <UiEditable
                editable
                :initial-value="currentToMinutesOnly(space.min_voting_period)"
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
                    minVotingPeriod
                      ? _d(minVotingPeriod)
                      : formatCurrentValue(space.min_voting_period) || 'No min.'
                  "
                />
              </UiEditable>
            </div>
            <div>
              <div class="s-label !mb-0">Max. voting period</div>
              <UiEditable
                editable
                :initial-value="currentToMinutesOnly(space.max_voting_period)"
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
                    maxVotingPeriod
                      ? _d(maxVotingPeriod)
                      : formatCurrentValue(space.max_voting_period)
                  "
                />
              </UiEditable>
            </div>
            <div v-if="space.proposal_threshold !== '0'">
              <div class="s-label !mb-0" v-text="'Proposal threshold'" />
              <h4
                class="text-skin-link text-md"
                v-text="space.proposal_threshold"
              />
            </div>
          </div>
        </div>
        <div v-else-if="activeTab === 'execution'" class="mb-4">
          <h3 class="text-md leading-6">Execution(s)</h3>
          <span class="mb-4 inline-block">
            This data is for information purposes only
          </span>
          <FormStrategiesStrategyActive
            v-for="strategy in executionStrategies"
            :key="strategy.id"
            read-only
            :network-id="space.network"
            :strategy="strategy"
          />
        </div>
        <div v-else-if="activeTab === 'controller'" class="mb-4">
          <h3 class="text-md leading-6">Controller</h3>
          <span class="mb-4 inline-block">Placeholder description</span>
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
        </div>
        <div
          v-if="!uiStore.sidebarOpen && isModified && !valuesChanged"
          class="fixed bg-skin-bg bottom-0 left-0 right-0 lg:left-[312px] xl:right-[240px] border-y px-4 py-3 flex justify-between items-center"
        >
          <h4 class="leading-7 font-medium">You have unsaved changes</h4>
          <div class="space-x-3">
            <button type="reset" class="text-skin-heading" @click="reset">
              Reset
            </button>
            <UiButton :loading="saving" primary @click="save">Save</UiButton>
          </div>
        </div>
      </template>
    </div>
  </template>
</template>
