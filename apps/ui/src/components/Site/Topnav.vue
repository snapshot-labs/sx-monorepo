<script setup lang="ts">
const { toggleSkin, currentMode } = useUserSkin();
</script>

<template>
  <div
    class="p-4 lg:px-6 flex justify-center items-center absolute z-10 left-0 right-0"
  >
    <div class="grow">
      <AppLink
        :to="{ name: 'site-landing' }"
        class="text-[26px] text-skin-link inline-block"
      >
        <div class="flex items-center space-x-2.5">
          <img
            src="@/assets/snapshot.svg"
            alt="Snapshot"
            class="w-[24px] relative top-[2px]"
          />
          <span>snapshot</span>
        </div>
      </AppLink>
    </div>
    <ul class="hidden lg:flex text-md text-skin-link space-x-4 mr-6">
      <li>
        <router-link :to="{ name: 'site-landing', hash: '#features' }">
          Features
        </router-link>
      </li>
      <li>
        <router-link :to="{ name: 'site-ecosystem' }">Ecosystem</router-link>
      </li>
      <li>
        <a href="https://docs.snapshot.box" target="_blank">
          Developers
          <IH-arrow-sm-right class="inline-block -rotate-45" />
        </a>
      </li>
      <li>
        <a href="https://snapshot.mirror.xyz" target="_blank">
          Blog
          <IH-arrow-sm-right class="inline-block -rotate-45" />
        </a>
      </li>
    </ul>
    <div class="shrink-0 space-x-3 items-center flex">
      <UiButton class="!px-0 w-[46px]" @click="toggleSkin">
        <IH-sun v-if="currentMode === 'dark'" class="inline-block" />
        <IH-moon v-else class="inline-block" />
      </UiButton>
      <UiButton :to="{ name: 'my-home' }" class="primary">
        Launch
        <span class="hidden md:inline-block">&nbsp;app</span>
      </UiButton>
    </div>
  </div>
</template>
