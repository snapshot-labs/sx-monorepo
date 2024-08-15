<script setup lang="ts">
import { getNetwork } from '@/networks';
import { Choice, Proposal } from '@/types';

type Messages = {
  title?: string;
  subtitle?: string;
};

const props = withDefaults(
  defineProps<{
    open: boolean;
    shareable: { proposal: Proposal; choice: Choice };
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

const network = computed(() => getNetwork(props.shareable.proposal.network));

watch(
  () => props.shareable,
  async (to, from) => {
    if (props.open && to.proposal.id !== from?.proposal.id) emit('close');
  },
  { immediate: true }
);
</script>

<template>
  <UiModal :open="open" class="text-skin-heading" @close="emit('close')">
    <div
      class="flex flex-col space-y-3 p-4 text-center items-center text-skin-text"
    >
      <div v-if="showIcon" class="bg-skin-success rounded-full p-[18px]">
        <IS-check :width="28" :height="28" class="text-skin-bg" />
      </div>

      <div class="flex flex-col space-y-1 leading-6">
        <h4
          class="font-semibold text-skin-heading text-lg"
          v-text="messages.title"
        />
        <div class="text-md font-medium" v-text="messages.subtitle" />
      </div>

      <div class="flex flex-col">
        <div class="text-md my-2">Share your vote</div>
        <div class="flex space-x-2">
          <a
            v-for="(socialNetwork, i) in SOCIAL_NETWORKS"
            :key="i"
            class="rounded-full leading-[100%] border text-skin-link size-[40px] flex items-center justify-center"
            :title="`Share on ${socialNetwork.name}`"
            :href="getShareUrl(socialNetwork.id, 'vote', shareable)"
            target="_blank"
          >
            <component :is="socialNetwork.icon" />
          </a>
        </div>
      </div>
    </div>
    <div v-if="txId" class="flex items-center justify-center p-4 pt-3 -mt-2">
      <a
        :href="network.helpers.getExplorerUrl(txId, 'transaction')"
        target="_blank"
        class="text-md font-medium text-skin-text leading-6"
      >
        View transaction
      </a>
    </div>
  </UiModal>
</template>
