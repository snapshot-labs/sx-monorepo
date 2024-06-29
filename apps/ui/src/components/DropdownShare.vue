<script setup lang="ts">
defineProps<{ message: string }>();

const uiStore = useUiStore();
const { copy } = useClipboard();
const { socialNetworks, shareMessage } = useSharing();

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
        <a
          class="flex items-center gap-2"
          :class="{ 'opacity-80': active }"
          @click="handleCopyLinkClick"
        >
          <IH-link />
          Copy link
        </a>
      </UiDropdownItem>
      <UiDropdownItem v-for="(network, i) in socialNetworks" :key="i" v-slot="{ active }" i>
        <a
          class="flex items-center gap-2"
          :class="{ 'opacity-80': active }"
          @click="shareMessage(network.id, message)"
        >
          <component :is="network.icon" />
          Share on {{ network.name }}
        </a>
      </UiDropdownItem>
    </template>
  </UiDropdown>
</template>
