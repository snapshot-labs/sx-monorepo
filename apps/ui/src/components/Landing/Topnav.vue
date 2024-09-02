<template>
  <div class="px-6 py-4 flex justify-center absolute z-10 left-0 right-0">
    <div
      class="text-[26px] text-skin-link items-center space-x-2.5 flex-grow md:flex !shrink-0"
    >
      <img src="@/assets/snapshot.svg" alt="Snapshot" class="w-[24px]" />
      <span class="mb-1">snapshot</span>
    </div>
    <ul
      class="hidden md:flex text-md text-skin-link space-x-3 mx-auto py-2 mr-6"
    >
      <li>Features</li>
      <li>Ecosystem</li>
      <li>Developers</li>
      <li>
        <a href="https://snapshot.mirror.xyz" target="_blank"> Blog </a>
      </li>
    </ul>
    <div class="shrink-0">
      <router-link :to="{ name: 'my-home' }">
        <UiButton class="primary"
          >Launch <span class="hidden md:inline-block">app</span></UiButton
        >
      </router-link>
    </div>
  </div>
</template>
<script setup lang="ts"></script>
