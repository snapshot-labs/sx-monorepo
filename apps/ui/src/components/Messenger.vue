<script setup lang="ts">
import { HELPDESK_URL } from '@/helpers/constants';
</script>

<template>
  <div class="hidden md:block fixed bottom-3 right-4 z-40">
    <UiTooltip title="Get help">
      <a :href="HELPDESK_URL" target="_blank">
        <UiButton class="!px-0 w-[46px]">
          <IS-chat class="inline-block" />
        </UiButton>
      </a>
    </UiTooltip>
  </div>
</template>
