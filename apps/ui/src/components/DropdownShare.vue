<script setup lang="ts">
import { Payload, PayloadType } from '@/composables/useSharing';

defineProps<{ shareable: Payload; type: PayloadType }>();

const uiStore = useUiStore();
const { copy } = useClipboard();
const { SOCIAL_NETWORKS, getShareUrl } = useSharing();

function handleCopyLinkClick() {
  copy(window.location.href);
  uiStore.addNotification('success', 'Link copied.');
}
</script>

<template>
  <UiDropdown>
    <template #button>
      <slot name="button">
        <UiButton v-bind="$attrs">
          <IH-share />
        </UiButton>
      </slot>
    </template>
    <template #items>
      <UiDropdownItem @click="handleCopyLinkClick">
        <IH-link />
        Copy link
      </UiDropdownItem>
      <UiDropdownItem
        v-for="(network, i) in SOCIAL_NETWORKS"
        :key="i"
        :title="`Share on ${network.name}`"
        :to="getShareUrl(network.id, type, shareable)"
      >
        <component :is="network.icon" />
        Share on {{ network.name }}
      </UiDropdownItem>
    </template>
  </UiDropdown>
</template>
