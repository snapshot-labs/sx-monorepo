<script setup lang="ts">
import {
  PRIVACY_TYPES_INFO,
  VALIDATION_TYPES_INFO,
  VOTING_TYPES_INFO
} from '@/helpers/constants';
import { _d } from '@/helpers/utils';
import { getValidator } from '@/helpers/validation';
import { getNetwork, offchainNetworks } from '@/networks';
import { ChainId, Space, Validation, VoteType } from '@/types';

const votingDelay = defineModel<number | null>('votingDelay', {
  required: true
});

const minVotingPeriod = defineModel<number | null>('minVotingPeriod', {
  required: true
});
const maxVotingPeriod = defineModel<number | null>('maxVotingPeriod', {
  required: true
});
const quorumType = defineModel<'default' | 'rejection'>('quorumType', {
  required: true
});
const quorum = defineModel<string | number>('quorum', {
  required: true
});
const votingType = defineModel<VoteType | 'any'>('votingType', {
  required: true
});
const privacy = defineModel<'none' | 'shutter'>('privacy', {
  required: true
});
const voteValidation = defineModel<Validation>('voteValidation', {
  required: true
});
const ignoreAbstainVotes = defineModel<boolean>('ignoreAbstainVotes', {
  required: true
});

const props = defineProps<{
  snapshotChainId: ChainId;
  space: Space;
}>();

const emit = defineEmits<{
  (e: 'updateValidity', valid: boolean): void;
}>();

const QUORUM_DEFINITION = {
  type: 'number',
  title: 'Quorum',
  minimum: 0,
  tooltip:
    'The minimum amount of voting power required for the proposal to pass'
};

const { getDurationFromCurrent, getCurrentFromDuration } = useMetaStore();

const isSelectVotingTypeModalOpen = ref(false);
const isSelectPrivacyModalOpen = ref(false);
const isSelectValidationModalOpen = ref(false);

const network = computed(() => getNetwork(props.space.network));
const isOffchainNetwork = computed(() =>
  offchainNetworks.includes(props.space.network)
);
const errors = computed(() => {
  const validator = getValidator({
    type: 'object',
    title: 'Voting',
    required: ['quorum'],
    properties: {
      quorum: QUORUM_DEFINITION
    }
  });

  return validator.validate({
    quorum: quorum.value
  });
});

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

watchEffect(() => {
  emit('updateValidity', Object.values(errors.value).length === 0);
});
</script>

<template>
  <h4 class="eyebrow mb-2 font-medium">Voting</h4>
  <div class="space-y-3">
    <div>
      <div class="s-label !mb-0">Voting delay</div>
      <UiEditable
        editable
        :initial-value="votingDelay || currentToMinutesOnly(space.voting_delay)"
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
    <div v-if="isOffchainNetwork" class="s-box">
      <UiSelect
        v-model="quorumType"
        :definition="{
          type: 'string',
          title: 'Quorum type',
          enum: ['default', 'rejection'],
          options: [
            { id: 'default', name: 'Default' },
            { id: 'rejection', name: 'Quorum of rejection' }
          ],
          tooltip: 'The type of quorum used for this space.'
        }"
      />
      <UiInputNumber
        v-model="quorum"
        :definition="QUORUM_DEFINITION"
        :error="errors.quorum"
      />
      <UiWrapperInput
        :definition="{
          title: 'Type',
          tooltip:
            'The type of voting system used for this space. (Enforced on all future proposals)'
        }"
      >
        <button
          type="button"
          class="s-input !flex flex-row justify-between items-center"
          @click="isSelectVotingTypeModalOpen = true"
        >
          <div>{{ VOTING_TYPES_INFO[votingType].label }}</div>
          <IH-chevron-down />
        </button>
      </UiWrapperInput>
      <UiWrapperInput
        :definition="{
          title: 'Privacy',
          tooltip:
            'The type of privacy used on proposals. (Enforced on all future proposals)'
        }"
      >
        <button
          type="button"
          class="s-input !flex flex-row justify-between items-center"
          @click="isSelectPrivacyModalOpen = true"
        >
          <div>{{ PRIVACY_TYPES_INFO[privacy].label }}</div>
          <IH-chevron-down />
        </button>
      </UiWrapperInput>
      <UiWrapperInput
        :definition="{
          title: 'Validation',
          tooltip:
            'The type of validation used to determine if a user can vote. (Enforced on all future proposals)'
        }"
      >
        <button
          type="button"
          class="s-input !flex flex-row justify-between items-center"
          @click="isSelectValidationModalOpen = true"
        >
          <div>
            {{
              VALIDATION_TYPES_INFO[
                voteValidation.name === 'any'
                  ? 'any-voting'
                  : voteValidation.name
              ].label
            }}
          </div>
          <IH-chevron-down />
        </button>
      </UiWrapperInput>
      <UiSwitch
        v-model="ignoreAbstainVotes"
        title="Ignore abstain votes in basic voting results"
      />
    </div>
  </div>
  <teleport to="#modal">
    <ModalSelectVotingType
      :open="isSelectVotingTypeModalOpen"
      :with-any="true"
      :initial-state="votingType"
      :voting-types="network.constants.EDITOR_VOTING_TYPES"
      @save="value => (votingType = value)"
      @close="isSelectVotingTypeModalOpen = false"
    />
    <ModalSelectPrivacy
      :open="isSelectPrivacyModalOpen"
      :initial-state="privacy"
      @save="value => (privacy = value)"
      @close="isSelectPrivacyModalOpen = false"
    />
    <ModalSelectValidation
      type="voting"
      :open="isSelectValidationModalOpen"
      :network-id="space.network"
      :default-chain-id="snapshotChainId"
      :space="space"
      :current="voteValidation"
      @close="isSelectValidationModalOpen = false"
      @save="value => (voteValidation = value)"
    />
  </teleport>
</template>
