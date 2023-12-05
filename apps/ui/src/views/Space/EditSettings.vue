<script setup lang="ts">
import objectHash from 'object-hash';
import { compareAddresses } from '@/helpers/utils';
import { evmNetworks, getNetwork } from '@/networks';
import { StrategyConfig, StrategyTemplate, GeneratedMetadata } from '@/networks/types';
import { Space, StrategyParsedMetadata } from '@/types';

const props = defineProps<{ space: Space }>();

const { updateStrategies } = useActions();

const network = computed(() => getNetwork(props.space.network));

const loading = ref(true);
const saving = ref(false);
const authenticators = ref([] as StrategyConfig[]);
const validationStrategy = ref(null as StrategyConfig | null);
const votingStrategies = ref([] as StrategyConfig[]);

function processParams(paramsArray: string[]) {
  return paramsArray.map(params => (params === '' ? [] : params.split(',')));
}

function processMetadata(metadataArray: StrategyParsedMetadata[]): GeneratedMetadata[] {
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

  return (await Promise.all(promises)).filter(strategy => strategy !== null) as StrategyConfig[];
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

  const resolvedParams = strategy.parseParams ? await strategy.parseParams(params, null) : {};
  const strategies = await getInitialStrategiesConfig(
    nestedStrategies,
    network.value.constants.EDITOR_VOTING_STRATEGIES,
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
    params = strategy.generateParams ? strategy.generateParams(strategy.params) : ['0x'];
    previousParams = previousParams ?? ['0x'];
  } else {
    params = strategy.generateParams ? strategy.generateParams(strategy.params) : [];
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

    await updateStrategies(
      props.space,
      authenticatorsToAdd,
      authenticatorsToRemove,
      strategiesToAdd,
      strategiesToRemove,
      validationStrategy.value
    );
  } finally {
    saving.value = false;
  }
}

watchEffect(async () => {
  loading.value = true;

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

  loading.value = false;
});
</script>

<template>
  <div class="space-y-4 mx-4 pt-4">
    <UiLoading v-if="loading" />
    <template v-else>
      <BlockSpaceFormStrategies
        v-model="authenticators"
        unique
        :available-strategies="network.constants.EDITOR_AUTHENTICATORS"
        title="Authenticators"
        description="Authenticators are customizable contracts that verify user identity for proposing and voting using different methods."
      />
      <BlockSpaceFormValidation
        v-model="validationStrategy"
        :available-strategies="network.constants.EDITOR_PROPOSAL_VALIDATIONS"
        :available-voting-strategies="network.constants.EDITOR_VOTING_STRATEGIES"
        title="Proposal validation"
        description="Proposal validation strategies are used to determine if a user is allowed to create a proposal."
      />
      <BlockSpaceFormStrategies
        v-model="votingStrategies"
        :available-strategies="network.constants.EDITOR_VOTING_STRATEGIES"
        title="Voting strategies"
        description="Voting strategies are customizable contracts used to define how much voting power each user has when casting a vote."
      />
      <UiButton :loading="saving" class="w-full" @click="save">Save</UiButton>
    </template>
  </div>
</template>
