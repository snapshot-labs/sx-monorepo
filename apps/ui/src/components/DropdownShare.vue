<script setup lang="ts">
import { PayloadType, ShareableType } from '@/composables/useSharing';

defineProps<{ shareable: PayloadType; type: ShareableType }>();

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
          <IH-share class="inline-block" />
        </UiButton>
      </slot>
    </template>
    <template #items>
      <UiDropdownItem v-slot="{ active }">
        <button
          type="button"
          class="flex items-center gap-2"
          :class="{ 'opacity-80': active }"
          @click="handleCopyLinkClick"
        >
          <IH-link />
          Copy link
        </button>
      </UiDropdownItem>
      <UiDropdownItem
        v-for="(network, i) in SOCIAL_NETWORKS"
        :key="i"
        v-slot="{ active }"
      >
        <a
          class="flex items-center gap-2"
          :class="{ 'opacity-80': active }"
          target="_blank"
          :title="`Share on ${network.name}`"
          :href="getShareUrl(network.id, type, shareable)"
        >
          <component :is="network.icon" />
          Share on {{ network.name }}
        </a>
      </UiDropdownItem>
    </template>
  </UiDropdown>
</template>
