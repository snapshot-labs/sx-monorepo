<script setup lang="ts">
import { HELPDESK_URL } from '@/helpers/constants';

const { isWhiteLabel, resolved } = useWhiteLabel();
</script>

<template>
  <div class="hidden xl:block fixed bottom-3 right-4 z-40 space-x-2">
    <UiTooltip v-if="resolved && !isWhiteLabel" title="About Snapshot">
      <router-link :to="{ name: 'site-landing' }" tabindex="-1">
        <UiButton class="!px-0 w-[46px]">
          <IC-zap class="inline-block size-[24px]" />
        </UiButton>
      </router-link>
    </UiTooltip>
    <UiTooltip title="Get help">
      <a :href="HELPDESK_URL" target="_blank" tabindex="-1">
        <UiButton class="!px-0 w-[46px]">
          <IH-chat class="inline-block" />
        </UiButton>
      </a>
    </UiTooltip>
  </div>
</template>
