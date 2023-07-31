<script setup lang="ts">
import { shorten, _d, compareAddresses } from '@/helpers/utils';
import { getNetwork } from '@/networks';
import { Space } from '@/types';

const props = defineProps<{ space: Space }>();

const { setTitle } = useTitle();
const { web3 } = useWeb3();
const { setVotingDelay, setMinVotingDuration, setMaxVotingDuration, transferOwnership } =
  useActions();

const network = computed(() => getNetwork(props.space.network));
const spaceIsEditable = computed(() =>
  compareAddresses(props.space.controller, web3.value.account)
);

const settingsLoading = ref({
  votingDelay: false,
  minVotingPeriod: false,
  maxVotingPeriod: false,
  controller: false
});

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

watchEffect(() => {
  setTitle(`Settings - ${props.space.name}`);
});
</script>

<template>
  <div class="space-y-3">
    <div>
      <Label :label="'Voting'" sticky />
      <div class="mx-4 pt-3">
        <div class="mb-3">
          <div class="s-label !mb-0">Voting delay</div>
          <UiEditable
            :editable="spaceIsEditable"
            :initial-value="space.voting_delay"
            :loading="settingsLoading.votingDelay"
            :definition="{
              type: 'integer'
            }"
            @save="value => handleSave('votingDelay', value.toString())"
          >
            <h4 class="text-skin-link text-md" v-text="_d(space.voting_delay) || 'No delay'" />
          </UiEditable>
        </div>
        <div class="mb-3">
          <div class="s-label !mb-0">Min. voting period</div>
          <UiEditable
            :editable="spaceIsEditable"
            :initial-value="space.min_voting_period"
            :loading="settingsLoading.minVotingPeriod"
            :definition="{
              type: 'integer'
            }"
            :custom-error-validation="
              value =>
                Number(value) > space.max_voting_period
                  ? 'Must be equal to or lower than max. voting period'
                  : undefined
            "
            @save="value => handleSave('minVotingPeriod', value.toString())"
          >
            <h4 class="text-skin-link text-md" v-text="_d(space.min_voting_period) || 'No min.'" />
          </UiEditable>
        </div>
        <div class="mb-3">
          <div class="s-label !mb-0">Max. voting period</div>
          <UiEditable
            :editable="spaceIsEditable"
            :initial-value="space.max_voting_period"
            :loading="settingsLoading.maxVotingPeriod"
            :definition="{
              type: 'integer'
            }"
            :custom-error-validation="
              value =>
                Number(value) < space.min_voting_period
                  ? 'Must be equal to or higher than min. voting period'
                  : undefined
            "
            @save="value => handleSave('maxVotingPeriod', value.toString())"
          >
            <h4 class="text-skin-link text-md" v-text="_d(space.max_voting_period)" />
          </UiEditable>
        </div>
        <div v-if="space.proposal_threshold !== '0'" class="mb-3">
          <div class="s-label !mb-0" v-text="'Proposal threshold'" />
          <h4 class="text-skin-link text-md" v-text="space.proposal_threshold" />
        </div>
      </div>
    </div>

    <div>
      <Label :label="'Controller'" sticky />
      <div class="py-3 mx-4">
        <UiEditable
          :editable="spaceIsEditable"
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
            <Stamp :id="space.controller" type="avatar" :size="18" class="mr-2 rounded-sm" />
            {{ shorten(space.controller) }}
            <IH-external-link class="inline-block" />
          </a>
        </UiEditable>
      </div>
    </div>

    <div>
      <Label :label="'Auth(s)'" sticky />
      <div v-for="(auth, i) in space.authenticators" :key="i" class="mx-4 py-3 border-b">
        <a :href="network.helpers.getExplorerUrl(auth, 'contract')" target="_blank" class="flex">
          <h4 class="flex-auto" v-text="network.constants.AUTHS[auth]" />
          <div>
            <Stamp :id="auth" type="avatar" :size="18" class="mr-2 rounded-sm" />
            {{ shorten(auth) }} <IH-external-link class="inline-block" />
          </div>
        </a>
      </div>
    </div>

    <div>
      <Label :label="'Proposal validation'" sticky />
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
            <Stamp
              :id="space.validation_strategy"
              type="avatar"
              :size="18"
              class="mr-2 rounded-sm"
            />
            {{ shorten(space.validation_strategy) }} <IH-external-link class="inline-block" />
          </div>
        </a>
      </div>
    </div>

    <div>
      <Label :label="'Strategie(s)'" sticky />
      <div v-for="(strategy, i) in space.strategies" :key="i" class="mx-4 py-3 border-b">
        <a
          :href="network.helpers.getExplorerUrl(strategy, 'contract')"
          target="_blank"
          class="flex"
        >
          <h4 class="flex-auto" v-text="network.constants.STRATEGIES[strategy]" />
          <div>
            <Stamp :id="strategy" type="avatar" :size="18" class="mr-2 rounded-sm" />
            {{ shorten(strategy) }} <IH-external-link class="inline-block" />
          </div>
        </a>
      </div>
    </div>

    <div>
      <Label :label="'Execution(s)'" sticky />
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
            <Stamp :id="executor" type="avatar" :size="18" class="mr-2 rounded-sm" />
            {{ shorten(executor) }} <IH-external-link class="inline-block" />
          </div>
        </a>
      </div>
    </div>
  </div>
</template>
