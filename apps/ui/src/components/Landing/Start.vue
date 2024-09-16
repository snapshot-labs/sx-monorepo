<template>
  <div class="py-9 flex items-center justify-center relative">
    <div
      class="absolute blocks-x top-0 right-[50%] left-0 bottom-0 !bg-right-top -z-10"
    />
    <UiContainer class="!max-w-screen-lg">
      <div class="text-center max-w-[600px] mx-auto">
        <div class="eyebrow mb-3">Join Snapshot</div>
        <h1 class="mb-4 font-display !text-[44px]">Ready to govern?</h1>
        <AppLink :to="{ name: 'my-home' }" button class="primary">
          Get started
        </AppLink>
      </div>
    </UiContainer>
  </div>
</template>
