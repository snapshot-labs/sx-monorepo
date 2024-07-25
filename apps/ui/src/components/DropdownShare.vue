<script setup lang="ts">
defineProps<{ message: string }>();

const uiStore = useUiStore();
const { copy } = useClipboard();

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
          class="flex items-center gap-2"
          :class="{ 'opacity-80': active }"
          @click="handleCopyLinkClick"
        >
          <IH-link />
          Copy link
        </button>
      </UiDropdownItem>
      <UiDropdownItem v-slot="{ active }">
        <a
          class="flex items-center gap-2"
          :class="{ 'opacity-80': active }"
          :href="`https://twitter.com/intent/tweet/?text=${message}`"
          target="_blank"
        >
          <IC-x />
          Share on X
        </a>
      </UiDropdownItem>
      <UiDropdownItem v-slot="{ active }">
        <a
          class="flex items-center gap-2"
          :class="{ 'opacity-80': active }"
          :href="`https://hey.xyz/?hashtags=Snapshot&text=${message}`"
          target="_blank"
        >
          <IC-lens />
          Share on Lens
        </a>
      </UiDropdownItem>
      <UiDropdownItem v-slot="{ active }">
        <a
          class="flex items-center gap-2"
          :class="{ 'opacity-80': active }"
          :href="`https://warpcast.com/~/compose?text=${message}`"
          target="_blank"
        >
          <IC-farcaster />
          Share on Farcaster
        </a>
      </UiDropdownItem>
    </template>
  </UiDropdown>
</template>
