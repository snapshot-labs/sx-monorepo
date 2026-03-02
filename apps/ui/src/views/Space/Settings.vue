<script setup lang="ts">
import { useQueryClient } from '@tanstack/vue-query';
import RelayerBalance from '@/components/RelayerBalance.vue';
import SpaceBilling from '@/components/SpaceBilling.vue';
import {
  DISABLED_STRATEGIES,
  OVERRIDING_STRATEGIES
} from '@/helpers/constants';
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

const uiStore = useUiStore();
const queryClient = useQueryClient();
const { setTitle } = useTitle();
const {
  isRevealed: isLeaveConfirmModalOpen,
  reveal: revealLeaveConfirm,
  confirm: confirmLeave,
  cancel: cancelLeave
} = useConfirmDialog();

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
    | 'billing'
    | 'controller';
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
        visible: true
      },
      {
        id: 'proposal',
        visible: true
      },
      {
        id: 'voting-strategies',
        visible: true
      },
      {
        id: 'voting',
        visible: true
      },
      {
        id: 'members',
        visible: isOffchainNetwork.value
      },
      {
        id: 'execution',
        visible: !isOffchainNetwork.value
      },
      {
        id: 'authenticators',
        visible: !isOffchainNetwork.value
      },
      {
        id: 'treasuries',
        visible: true
      },
      {
        id: 'delegations',
        visible: true
      },
      {
        id: 'labels',
        visible: true
      },
      {
        id: 'whitelabel',
        visible: isOffchainNetwork.value
      },
      {
        id: 'advanced',
        visible: isOffchainNetwork.value
      },
      {
        id: 'billing',
        visible: isOffchainNetwork.value
      },
      {
        id: 'controller',
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

    if (
      !isTicketValid.value ||
      strategies.value.some(s => DISABLED_STRATEGIES.includes(s.address)) ||
      (!props.space.turbo &&
        strategies.value.some(s => OVERRIDING_STRATEGIES.includes(s.address)))
    ) {
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
    error.value ||
    props.space.additionalRawData?.hibernated
  );
});

// Live space with minimum properties for alerts
const pendingSpace = computed(() => {
  return {
    ...props.space,
    strategies: strategies.value.map(strategy => strategy.name),
    strategies_params: strategies.value.map(strategy => ({
      name: strategy.name,
      params: strategy.params,
      network: strategy.chainId
        ? String(strategy.chainId)
        : snapshotChainId.value
    })),
    snapshot_chain_id: snapshotChainId.value,
    authenticators: authenticators.value.map(strategy => strategy.address)
  };
});

function isValidTab(param: string | string[]): param is Tab['id'] {
  if (Array.isArray(param)) return false;
  return tabs.value.find(tab => tab.id === param)?.visible ?? false;
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
      const result = await save();
      reloadSpaceAndReset();
      if (result) {
        uiStore.addNotification(
          'success',
          'Your changes were successfully saved.'
        );
      }
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
    uiStore.addNotification('success', 'Your space was successfully deleted.');
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

onBeforeRouteLeave(async to => {
  if (!isModified.value || !canModifySettings.value) return true;
  if (to.name !== 'space-pro') return true;

  const { isCanceled } = await revealLeaveConfirm();
  return !isCanceled;
});

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
  <div
    v-bind="$attrs"
    class="!h-auto"
    :style="`min-height: calc(100vh - ${bottomToolbarHeight + 73}px)`"
  >
    <div v-if="loading" class="p-4">
      <UiLoading />
    </div>
    <div
      v-else
      class="flex-grow"
      :class="{
        'px-4 pt-4': !['profile', 'billing'].includes(activeTab)
      }"
    >
      <SpaceSettingsAlerts
        :space="pendingSpace"
        :active-tab="activeTab"
        class="mb-4"
        :class="{
          'max-w-full': activeTab === 'whitelabel',
          'max-w-[592px]': activeTab !== 'whitelabel'
        }"
      />
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
          :space-id="space.id"
          :voting-power-symbol="space.voting_power_symbol"
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
          :space-id="space.id"
          :voting-power-symbol="space.voting_power_symbol"
          :show-test-button="true"
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
        v-if="activeTab === 'execution'"
        title="Execution(s)"
        description="Execution strategies determine if a proposal passes and how it is executed. This section is currently read-only."
      >
        <div class="space-y-3">
          <FormSpaceExecutionStrategies
            :space="space"
            :execution-strategies="executionStrategies"
          />
          <UiButton
            v-if="evmNetworks.includes(space.network)"
            @click="customStrategyModalOpen = true"
          >
            Add custom strategy
          </UiButton>
        </div>
      </UiContainerSettings>
      <UiContainerSettings v-if="activeTab === 'authenticators'">
        <FormStrategies
          v-model="authenticators"
          unique
          :network-id="space.network"
          :available-strategies="network.constants.EDITOR_AUTHENTICATORS"
          title="Authenticators"
          description="Authenticators are customizable contracts that verify user identity for proposing and voting using different methods."
          :space-id="space.id"
          :voting-power-symbol="space.voting_power_symbol"
        />
        <RelayerBalance :space="space" :network="network" />
      </UiContainerSettings>
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
        title="Custom domain"
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
      <SpaceBilling v-if="activeTab === 'billing'" :space="space" />
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
  <SettingsToolbar
    v-if="showToolbar"
    ref="el"
    :error="error"
    :is-modified="!!isModified"
    :saving="saving"
    :save-label="
      space.additionalRawData?.hibernated && !isModified ? 'Reactivate' : 'Save'
    "
    @save="handleSettingsSave"
    @reset="reset()"
  />
  <teleport to="#modal">
    <ModalCustomStrategy
      :open="customStrategyModalOpen"
      :network-id="space.network"
      :chain-id="network.chainId"
      @close="customStrategyModalOpen = false"
      @save="addCustomStrategy"
    />
    <UiModal :open="isLeaveConfirmModalOpen" @close="cancelLeave">
      <template #header>
        <h3>Unsaved changes</h3>
      </template>
      <div class="s-box p-4">
        <UiMessage type="danger">
          You have unsaved changes. Are you sure you want to leave?
        </UiMessage>
      </div>
      <template #footer>
        <div class="flex gap-3 w-full">
          <UiButton class="flex-1" @click="cancelLeave">Stay</UiButton>
          <UiButton class="flex-1" primary @click="confirmLeave">
            Leave
          </UiButton>
        </div>
      </template>
    </UiModal>
    <ModalTransactionProgress
      :open="saving && (!isOffchainNetwork || executeFn === saveController)"
      :chain-id="network.chainId"
      :messages="{
        approveTitle: 'Confirm your changes',
        successTitle: 'Done!',
        successSubtitle: 'Your changes were successfully saved'
      }"
      :execute="executeFn"
      :wait-for-index="!isOffchainNetwork"
      @confirmed="
        reloadSpaceAndReset();
        saving = false;
      "
      @close="saving = false"
      @cancelled="saving = false"
    />
  </teleport>
</template>
