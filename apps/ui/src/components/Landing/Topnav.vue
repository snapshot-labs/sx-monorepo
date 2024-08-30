<template>
  <div class="px-6 py-4 flex justify-center absolute z-10 left-0 right-0">
    <div class="text-[26px] text-skin-link">snapshot</div>
    <ul class="text-md text-skin-link flex space-x-3 mx-auto py-2">
      <li>Features</li>
      <li>Ecosystem</li>
      <li>Developers</li>
      <li>Blog</li>
      <li>FAQ</li>
    </ul>
    <div>
      <router-link :to="{ name: 'my-home' }">
        <UiButton class="primary">Launch app</UiButton>
      </router-link>
    </div>
  </div>
</template>
<script setup lang="ts"></script>
