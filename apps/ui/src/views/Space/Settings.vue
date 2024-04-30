<script setup lang="ts">
import { shorten, _d, compareAddresses } from '@/helpers/utils';
import { getNetwork } from '@/networks';
import { Space } from '@/types';

const props = defineProps<{ space: Space }>();

const { setTitle } = useTitle();
const { web3 } = useWeb3();
const { getDurationFromCurrent, getCurrentFromDuration } = useMetaStore();
const { setVotingDelay, setMinVotingDuration, setMaxVotingDuration, transferOwnership } =
  useActions();

const network = computed(() => getNetwork(props.space.network));
const isController = computed(() => compareAddresses(props.space.controller, web3.value.account));

const settingsLoading = ref({
  votingDelay: false,
  minVotingPeriod: false,
  maxVotingPeriod: false,
  controller: false
});

function currentToMinutesOnly(value: number) {
  const duration = getDurationFromCurrent(props.space.network, value);
  return Math.round(duration / 60) * 60;
}

function formatCurrentValue(value: number) {
  return _d(currentToMinutesOnly(value));
}

async function handleSave(
  field: 'votingDelay' | 'minVotingPeriod' | 'maxVotingPeriod' | 'controller',
  value: string
) {
  const fieldActions = {
    votingDelay: setVotingDelay,
    minVotingPeriod: setMinVotingDuration,
    maxVotingPeriod: setMaxVotingDuration,
    controller: transferOwnership
  };

  if (!fieldActions[field]) return;

  settingsLoading.value[field] = true;

  try {
    if (field === 'controller') {
      await fieldActions[field](props.space, value);
    } else {
      await fieldActions[field](props.space, parseInt(value));
    }
  } finally {
    settingsLoading.value[field] = false;
  }
}

watchEffect(() => setTitle(`Settings - ${props.space.name}`));
</script>

<template>
  <div class="space-y-3">
    <div>
      <UiLabel :label="'Voting'" sticky />
      <div class="mx-4 pt-3">
        <div class="mb-3">
          <div class="s-label !mb-0">Voting delay</div>
          <UiEditable
            :editable="isController"
            :initial-value="currentToMinutesOnly(space.voting_delay)"
            :loading="settingsLoading.votingDelay"
            :definition="{
              type: 'integer',
              format: 'duration'
            }"
            @save="value => handleSave('votingDelay', value.toString())"
          >
            <h4
              class="text-skin-link text-md"
              v-text="formatCurrentValue(space.voting_delay) || 'No delay'"
            />
          </UiEditable>
        </div>
        <div class="mb-3">
          <div class="s-label !mb-0">Min. voting period</div>
          <UiEditable
            :editable="isController"
            :initial-value="currentToMinutesOnly(space.min_voting_period)"
            :loading="settingsLoading.minVotingPeriod"
            :definition="{
              type: 'integer',
              format: 'duration'
            }"
            :custom-error-validation="
              value =>
                getCurrentFromDuration(space.network, Number(value)) > space.max_voting_period
                  ? 'Must be equal to or lower than max. voting period'
                  : undefined
            "
            @save="value => handleSave('minVotingPeriod', value.toString())"
          >
            <h4
              class="text-skin-link text-md"
              v-text="formatCurrentValue(space.min_voting_period) || 'No min.'"
            />
          </UiEditable>
        </div>
        <div class="mb-3">
          <div class="s-label !mb-0">Max. voting period</div>
          <UiEditable
            :editable="isController"
            :initial-value="currentToMinutesOnly(space.max_voting_period)"
            :loading="settingsLoading.maxVotingPeriod"
            :definition="{
              type: 'integer',
              format: 'duration'
            }"
            :custom-error-validation="
              value =>
                getCurrentFromDuration(space.network, Number(value)) < space.min_voting_period
                  ? 'Must be equal to or higher than min. voting period'
                  : undefined
            "
            @save="value => handleSave('maxVotingPeriod', value.toString())"
          >
            <h4
              class="text-skin-link text-md"
              v-text="formatCurrentValue(space.max_voting_period)"
            />
          </UiEditable>
        </div>
        <div v-if="space.proposal_threshold !== '0'" class="mb-3">
          <div class="s-label !mb-0" v-text="'Proposal threshold'" />
          <h4 class="text-skin-link text-md" v-text="space.proposal_threshold" />
        </div>
      </div>
    </div>

    <div>
      <UiLabel :label="'Controller'" sticky />
      <div class="py-3 mx-4">
        <UiEditable
          :editable="isController"
          :initial-value="space.controller"
          :loading="settingsLoading.controller"
          :definition="{
            type: 'string',
            format: 'address',
            examples: ['0x0000…']
          }"
          @save="value => handleSave('controller', value.toString())"
        >
          <a :href="network.helpers.getExplorerUrl(space.controller, 'contract')" target="_blank">
            <UiStamp :id="space.controller" type="avatar" :size="18" class="mr-2 rounded-sm" />
            {{ shorten(space.controller) }}
            <IH-arrow-sm-right class="inline-block -rotate-45" />
          </a>
        </UiEditable>
      </div>
    </div>

    <div>
      <UiLabel :label="'Auth(s)'" sticky />
      <div v-for="(auth, i) in space.authenticators" :key="i" class="mx-4 py-3 border-b">
        <a :href="network.helpers.getExplorerUrl(auth, 'contract')" target="_blank" class="flex">
          <h4 class="flex-auto" v-text="network.constants.AUTHS[auth]" />
          <div>
            <UiStamp :id="auth" type="avatar" :size="18" class="mr-2 rounded-sm" />
            {{ shorten(auth) }} <IH-arrow-sm-right class="inline-block -rotate-45" />
          </div>
        </a>
      </div>
    </div>

    <div>
      <UiLabel :label="'Proposal validation'" sticky />
      <div class="mx-4 py-3 border-b">
        <a
          :href="network.helpers.getExplorerUrl(space.validation_strategy, 'contract')"
          target="_blank"
          class="flex"
        >
          <h4
            class="flex-auto"
            v-text="network.constants.PROPOSAL_VALIDATIONS[space.validation_strategy]"
          />
          <div>
            <UiStamp
              :id="space.validation_strategy"
              type="avatar"
              :size="18"
              class="mr-2 rounded-sm"
            />
            {{ shorten(space.validation_strategy) }}
            <IH-arrow-sm-right class="inline-block -rotate-45" />
          </div>
        </a>
      </div>
    </div>

    <div>
      <UiLabel :label="'Strategie(s)'" sticky />
      <div v-for="(strategy, i) in space.strategies" :key="i" class="mx-4 py-3 border-b">
        <a
          :href="network.helpers.getExplorerUrl(strategy, 'strategy')"
          target="_blank"
          class="flex"
        >
          <h4 class="flex-auto" v-text="network.constants.STRATEGIES[strategy] || strategy" />
          <div>
            <UiStamp :id="strategy" type="avatar" :size="18" class="mr-2 rounded-sm" />
            {{ shorten(strategy) }} <IH-arrow-sm-right class="inline-block -rotate-45" />
          </div>
        </a>
      </div>
    </div>

    <div>
      <UiLabel :label="'Execution(s)'" sticky />
      <div v-for="(executor, i) in space.executors" :key="i" class="mx-4 py-3 border-b">
        <a
          :href="network.helpers.getExplorerUrl(executor, 'contract')"
          target="_blank"
          class="flex"
        >
          <h4
            class="inline-block mr-3 flex-auto"
            v-text="
              network.constants.EXECUTORS[executor] ||
              network.constants.EXECUTORS[space.executors_types[i]] ||
              space.executors_types[i]
            "
          />
          <div>
            <UiStamp :id="executor" type="avatar" :size="18" class="mr-2 rounded-sm" />
            {{ shorten(executor) }} <IH-arrow-sm-right class="inline-block -rotate-45" />
          </div>
        </a>
      </div>
    </div>
  </div>
</template>
