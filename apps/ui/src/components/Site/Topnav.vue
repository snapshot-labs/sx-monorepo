<script setup lang="ts">
const { toggleTheme, currentTheme } = useTheme();
</script>

<template>
  <div
    class="p-4 lg:px-6 flex justify-center items-center absolute z-10 left-0 right-0 max-w-maximum mx-auto"
  >
    <div class="grow">
      <AppLink
        :to="{ name: 'site-landing' }"
        class="text-[29px] text-skin-link inline-block"
      >
        <div class="flex items-center space-x-2.5">
          <IC-snapshot class="size-[32px]" />
          <span class="mb-1">snapshot</span>
        </div>
      </AppLink>
    </div>
    <ul class="hidden lg:flex text-md text-skin-link space-x-4 mr-6">
      <li>
        <AppLink :to="{ name: 'site-landing', hash: '#features' }">
          Features
        </AppLink>
      </li>
      <li>
        <AppLink :to="{ name: 'site-ecosystem' }">Ecosystem</AppLink>
      </li>
      <li>
        <AppLink to="https://docs.snapshot.box"> Developers </AppLink>
      </li>
      <li>
        <AppLink to="https://snapshot.mirror.xyz"> Blog </AppLink>
      </li>
    </ul>
    <div class="shrink-0 space-x-3 items-center flex">
      <UiButton uniform @click="toggleTheme">
        <IH-sun v-if="currentTheme === 'dark'" class="inline-block" />
        <IH-moon v-else class="inline-block" />
      </UiButton>
      <UiButton :to="{ name: 'my-home' }" primary class="!gap-0">
        Launch
        <span class="hidden md:inline-block">&nbsp;app</span>
      </UiButton>
    </div>
  </div>
</template>
