<script setup lang="ts">
import { PayloadType, Vote } from '@/composables/useSharing';
import { AuctionNetworkId, SellOrder } from '@/helpers/auction';
import { getNetwork } from '@/networks';
import { NetworkID } from '@/types';

type Messages = {
  title?: string;
  subtitle?: string;
};

const props = withDefaults(
  defineProps<{
    open: boolean;
    shareable: Vote | SellOrder;
    network: NetworkID | AuctionNetworkId;
    type: PayloadType;
    txId: string | null;
    messages?: Messages;
    showIcon?: boolean;
  }>(),
  {
    messages: () => ({}),
    showIcon: false
  }
);

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const { SOCIAL_NETWORKS, getShareUrl } = useSharing();

const network = computed(() => getNetwork(props.network));

watch(
  () => props.shareable,
  async (to, from) => {
    if (props.type !== 'vote') return;

    if (props.open && (to as Vote).proposal.id !== (from as Vote)?.proposal.id)
      emit('close');
  },
  { immediate: true }
);
</script>

<template>
  <UiModal :open="open" class="text-skin-heading" @close="emit('close')">
    <div
      class="flex flex-col space-y-3 px-4 py-5 text-center items-center text-skin-text"
    >
      <div
        v-if="showIcon"
        class="bg-skin-success text-white rounded-full p-[12px]"
      >
        <IS-check :width="28" :height="28" />
      </div>

      <div class="flex flex-col space-y-1 leading-6">
        <h4
          class="font-semibold text-skin-heading text-lg"
          v-text="messages.title"
        />
        <div v-if="messages.subtitle" v-text="messages.subtitle" />
      </div>

      <div class="flex flex-col">
        <div class="my-2">Share your {{ type }}</div>
        <div class="flex space-x-2">
          <AppLink
            v-for="(socialNetwork, i) in SOCIAL_NETWORKS"
            :key="i"
            class="rounded-full leading-[100%] border text-skin-link size-[46px] flex items-center justify-center"
            :title="`Share on ${socialNetwork.name}`"
            :to="getShareUrl(socialNetwork.id, type, shareable)"
          >
            <component :is="socialNetwork.icon" />
          </AppLink>
        </div>
      </div>
    </div>
    <div v-if="txId" class="flex items-center justify-center p-4 pt-3 -mt-2">
      <AppLink :to="network.helpers.getExplorerUrl(txId, 'transaction')">
        View on explorer
      </AppLink>
    </div>
  </UiModal>
</template>
