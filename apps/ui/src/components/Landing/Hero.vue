<template>
  <div
    class="relative flex justify-center min-h-[600px] pt-[94px] items-center border-b"
  >
    <div
      class="absolute blocks top-0 left-[50%] right-0 bottom-0 !bg-left-top border-l"
    />
    <UiContainer
      class="relative w-full !max-w-screen-lg flex items-center py-8"
    >
      <div class="max-w-[560px]">
        <div
          class="absolute top-[200px] right-[300px] space-y-4 text-center font-bold"
        ></div>
        <div class="eyebrow mb-3">Turn chaos to consensus</div>
        <h1 class="mb-5 mono !text-[56px]">
          The governance stack for your organization
        </h1>
        <router-link :to="{ name: 'my-home' }">
          <UiButton class="primary">Get started</UiButton>
        </router-link>
      </div>
    </UiContainer>
  </div>
</template>
