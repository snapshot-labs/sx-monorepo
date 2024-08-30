<template>
  <div class="relative">
    <div
      class="absolute blocks bg-skin-bg top-0 left-[50%] right-0 bottom-0 !bg-left-bottom border-l"
    />
    <div class="relative pt-12 pb-8 border-b">
      <UiContainer class="!max-w-[1040px] min-h-[540px] flex items-center">
        <div class="max-w-[560px]">
          <img
            src="@/assets/landing/flow.svg"
            class="absolute top-[200px] right-[180px]"
          />
          <div class="eyebrow mb-3">Turn chaos to consensus</div>
          <h1 class="mb-6 mono !text-[56px]">
            The governance stack for your organization
          </h1>
          <router-link :to="{ name: 'my-home' }">
            <UiButton class="bg-skin-display border-skin-display text-white">
              Get started
            </UiButton>
          </router-link>
        </div>
      </UiContainer>
    </div>
  </div>
</template>
