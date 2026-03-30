<script setup lang="ts">
import { useSnack } from '@/composables/useSnack';
import { formatCents, SNACK_ENABLED } from '@/helpers/snack';
import { Proposal } from '@/types';

const props = defineProps<{ proposal: Proposal }>();

const proposalRef = toRef(props, 'proposal');

const { marketState, loading } = useSnack(proposalRef);
const { web3 } = useWeb3();
const { modalAccountOpen } = useModal();

const yesCents = computed(() =>
  marketState.value ? formatCents(marketState.value.yesProb) : 50
);

const modalOpen = ref(false);
const pendingReopen = ref(false);

function handleConnect() {
  modalOpen.value = false;
  pendingReopen.value = true;
  modalAccountOpen.value = true;
}

// Reopen snack modal after wallet connects
watch(
  () => web3.value.account,
  account => {
    if (account && pendingReopen.value) {
      pendingReopen.value = false;
      modalOpen.value = true;
    }
  }
);
</script>

<template>
  <div v-if="SNACK_ENABLED && proposal.type === 'basic'">
    <div
      class="flex items-center justify-center gap-2 w-full px-4 py-2 border-b text-skin-link cursor-pointer select-text"
      @click="modalOpen = true"
    >
      <IH-trending-up class="shrink-0" />
      <span v-if="loading">Prediction market</span>
      <span v-else
        >Prediction market · <strong>{{ yesCents }}%</strong> chance to
        pass</span
      >
    </div>

    <teleport to="#modal">
      <ModalSnack
        :open="modalOpen"
        :proposal="proposal"
        @close="modalOpen = false"
        @connect="handleConnect"
      />
    </teleport>
  </div>
</template>
