<script setup lang="ts">
import { HELPDESK_URL } from '@/helpers/constants';
</script>

<template>
  <a
    :href="HELPDESK_URL"
    target="_blank"
    class="hidden md:block fixed bottom-4 right-4 rounded-full bg-skin-link text-skin-bg p-2"
  >
    <IS-chat class="inline-block size-[32px]" />
  </a>
</template>
