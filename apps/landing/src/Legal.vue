<script setup lang="ts">
import pages from 'virtual:legal';
import { onBeforeUnmount } from 'vue';
import Logo from './Logo.vue';

const props = defineProps<{ page: keyof typeof pages }>();
const TITLES = { terms: 'Terms of use', privacy: 'Privacy policy' };
const landingTitle = document.title;
document.title = `${TITLES[props.page]} · Snapshot`;
// Before unmount, as the next legal page sets its title before unmounted runs.
onBeforeUnmount(() => (document.title = landingTitle));
</script>

<template>
  <!-- The logo closes the page and goes back to the landing's top. -->
  <header class="flex py-6"><Logo href="#/" /></header>
  <main class="mx-auto max-w-[1400px] px-5 pb-10 md:pb-[120px]">
    <article
      class="mx-auto max-w-[760px] text-[19px] leading-[28px] [&_a]:underline [&_h2]:mt-6 [&_h2]:text-[26px] [&_h2]:leading-[31.2px] [&_h3]:mt-4 [&_h3]:text-[22px] [&_h4]:mt-4 [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5"
    >
      <h1
        class="text-[52px] leading-[57.2px] md:text-[76px] md:leading-[83.6px]"
      >
        {{ TITLES[page] }}
      </h1>
      <p class="text-black/60">Last updated: {{ pages[page].updated }}</p>
      <div v-html="pages[page].html" />
    </article>
  </main>
</template>
