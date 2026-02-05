<template>
  <div class="py-9 flex items-center justify-center relative">
    <div
      class="absolute blocks-x top-0 right-[50%] left-0 bottom-0 !bg-right-top -z-10"
    />
    <UiContainer class="!max-w-screen-lg">
      <div class="text-center max-w-[600px] mx-auto">
        <UiEyebrow class="mb-3">Join Snapshot</UiEyebrow>
        <h1 class="mb-4 font-display text-[36px] xs:text-[44px]">
          Ready to govern?
        </h1>
        <UiButton :to="{ name: 'my-home' }" primary> Get started </UiButton>
      </div>
    </UiContainer>
  </div>
</template>
