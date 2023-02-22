<template>
  <div>
    <div class="py-8 mb-6 border-b hero">
      <Container class="max-w-screen-md">
        <div class="eyebrow mb-3" v-text="'Snapshot X'" />
        <h1 class="mb-5 mono">Where decisions<br />get made.</h1>
      </Container>
    </div>
    <Container class="max-w-screen-md space-y-4">
      <div class="border rounded-lg overflow-hidden text-skin-link">
        <div class="flex">
          <div class="px-4 bg-[color:var(--border-color)] flex justify-center items-center">
            <IH-exclamation class="my-1" />
          </div>
          <div class="px-4 py-3">
            The contracts have not yet undergone an audit. Use at your own risk.
          </div>
        </div>
      </div>
      <div class="space-y-2">
        <h3>Getting started</h3>
        <div class="space-x-2">
          <router-link :to="{ name: 'explore' }">
            <UiButton>Explore spaces</UiButton>
          </router-link>
          <router-link :to="{ name: 'create' }">
            <UiButton>Create space</UiButton>
          </router-link>
        </div>
      </div>
      <div class="space-y-2">
        <h3>Learn more</h3>
        <div class="space-y-2 flex flex-col sm:block sm:space-x-2 mb-4">
          <a href="https://docs.snapshotx.xyz" target="_blank">
            <UiButton>Documentation</UiButton>
          </a>
        </div>
      </div>
      <div class="space-y-2">
        <h3>Join the community</h3>
        <div class="space-x-2">
          <a href="https://twitter.com/SnapshotLabs" target="_blank">
            <img src="~@/assets/twitter.svg" class="w-[28px] h-[28px] inline-block" />
          </a>
          <a href="https://discord.gg/snapshot" target="_blank">
            <img src="~@/assets/discord.svg" class="w-[28px] h-[28px] inline-block" />
          </a>
          <a href="https://github.com/snapshot-labs" target="_blank">
            <img src="~@/assets/github.svg" class="w-[28px] h-[28px] inline-block" />
          </a>
        </div>
      </div>
    </Container>
  </div>
</template>
