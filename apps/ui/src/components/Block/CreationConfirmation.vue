<script setup lang="ts">
import { shorten } from '@/helpers/utils';
import { getNetwork } from '@/networks';
import { StrategyConfig } from '@/networks/types';
import { NetworkID, SpaceMetadata, SpaceSettings } from '@/types';

const props = defineProps<{
  networkId: NetworkID;
  salt: string;
  predictedSpaceAddress: string;
  metadata: SpaceMetadata;
  settings: SpaceSettings;
  authenticators: StrategyConfig[];
  validationStrategy: StrategyConfig;
  votingStrategies: StrategyConfig[];
  executionStrategies: StrategyConfig[];
  controller: string;
}>();

const { deployDependency, createSpace } = useActions();

const currentStep = ref(0);
const completed = ref(false);
const failed = ref(false);
const txIds = ref({});

const network = computed(() => getNetwork(props.networkId));
const steps = computed(() => {
  const dependenciesSteps = props.executionStrategies.filter(strategy => strategy.deploy);

  return [
    ...dependenciesSteps.map((config, i) => {
      const title = config.type
        ? `Deploying ${network.value.constants.EXECUTORS[config.type]} execution strategy`
        : 'Deploying dependency';

      return {
        id: `DEPLOYING_DEPS_${i}`,
        title
      };
    }),
    {
      id: 'DEPLOYING_SPACE',
      title: 'Deploying space'
    },
    {
      id: 'INDEXING_SPACE',
      title: 'Indexing space'
    }
  ];
});

async function deploy() {
  const dependenciesSteps = props.executionStrategies.filter(strategy => strategy.deploy);
  const executionStrategies = [] as StrategyConfig[];

  for (let i = 0; i < dependenciesSteps.length; i++) {
    const strategy = dependenciesSteps[i];

    try {
      const result = await deployDependency(
        props.networkId,
        props.controller,
        props.predictedSpaceAddress,
        strategy
      );

      if (!result) {
        failed.value = true;
        return;
      }

      const { address, txId } = result;

      txIds.value[`DEPLOYING_DEPS_${i}`] = txId;
      const confirmedReceipt = await network.value.helpers.waitForTransaction(txId);
      if (confirmedReceipt.status === 0) throw new Error('Transaction failed');

      executionStrategies.push({
        ...strategy,
        deploy: undefined,
        address
      });
      currentStep.value = currentStep.value + 1;
    } catch {
      failed.value = true;
      return;
    }
  }

  try {
    const result = await createSpace(
      props.networkId,
      props.salt,
      props.metadata,
      props.settings,
      props.authenticators,
      props.validationStrategy,
      props.votingStrategies,
      executionStrategies,
      props.controller
    );

    if (!result) {
      failed.value = true;
      return;
    }

    txIds.value['DEPLOYING_SPACE'] = result;

    const confirmedReceipt = await network.value.helpers.waitForTransaction(result);
    if (confirmedReceipt.status === 0) throw new Error('Transaction failed');

    currentStep.value = currentStep.value + 1;
  } catch {
    failed.value = true;
  }

  try {
    await network.value.helpers.waitForSpace(props.predictedSpaceAddress.toLowerCase());

    completed.value = true;
    currentStep.value = currentStep.value + 1;
  } catch {
    failed.value = true;
  }
}

onMounted(() => deploy());
</script>

<template>
  <div class="pt-5 max-w-[50rem] mx-auto px-4">
    <h1>Create new space</h1>
    <div>Do not refresh this page until process is complete.</div>

    <div class="flex flex-col mt-4">
      <div v-for="(step, i) in steps" :key="step.id" class="flex items-center gap-4 mb-3 last:mb-0">
        <div>
          <IH-check v-if="i < currentStep" class="text-green" />
          <IH-clock v-else-if="i > currentStep" />
          <template v-else>
            <UiLoading v-if="!failed" />
            <IH-exclamation-circle v-else class="text-red" />
          </template>
        </div>
        <div>
          <h4 v-text="step.title" />
          <a
            v-if="txIds[step.id]"
            class="inline-flex items-center"
            target="_blank"
            :href="network.helpers.getExplorerUrl(txIds[step.id], 'transaction')"
          >
            {{ shorten(txIds[step.id]) }}
            <IH-external-link class="inline-block ml-1" />
          </a>
        </div>
      </div>
    </div>
    <div v-if="completed" class="mt-4">
      You can now access your space
      <router-link
        :to="{
          name: 'space-overview',
          params: { id: `${networkId}:${predictedSpaceAddress?.toLowerCase()}` }
        }"
        text="here"
      />.
    </div>
  </div>
</template>
