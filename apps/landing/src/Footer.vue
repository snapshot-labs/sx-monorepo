<script setup lang="ts">
import { SOCIALS } from './socials';

// The copyright, the legal links and Snapshot elsewhere, lined up with the
// logo: fixed over the slides, at the end of the legal pages. Phones have
// room for the legal links only, tablets for the copyright too.
</script>

<template>
  <footer
    class="flex h-[53px] gap-4 bg-white px-5 text-[17px] [&>*]:flex [&>*]:items-center [&>*]:whitespace-nowrap"
  >
    <span class="max-sm:!hidden">
      © {{ new Date().getFullYear() }} Snapshot Labs AG
    </span>
    <a href="#/terms">Terms of use</a>
    <a href="#/privacy">Privacy policy</a>
    <nav aria-label="Snapshot elsewhere" class="gap-[14px] max-md:!hidden">
      <a
        v-for="social in SOCIALS"
        :key="social.name"
        :href="social.href"
        target="_blank"
        :aria-label="social.name"
      >
        <svg width="24" height="24" viewBox="0 0 1024 1024" aria-hidden="true">
          <path :d="social.path" :transform="social.transform" />
        </svg>
      </a>
    </nav>
  </footer>
</template>
