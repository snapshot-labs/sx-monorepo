<script setup lang="ts">
const title = ref('');
const discussion = ref('');
</script>

<template>
  <div>
    <div class="py-8 bg-skin-border/40">
      <UiContainer class="mt-8 pb-8 !max-w-[960px] space-y-8 text-center">
        <h2 class="mono-display">
          Think together,<br />
          spark changes
        </h2>
      </UiContainer>
    </div>
    <UiContainer class="!max-w-[960px] space-y-10 text-center">
      <PulseTitleForm class="-mt-8" />
      <div class="eyebrow">How it works?</div>

      <div class="relative overflow-hidden">
        <div class="absolute -right-[380px] top-[100px] w-full">
          <PulseTitleForm />
        </div>
        <div class="text-md text-left">
          <span
            class="font-heading rounded-full text-[22px] text-center py-1 mb-4 mr-2 inline-block justify-center items-center !size-[36px] bg-skin-link text-skin-bg"
            v-text="'1'"
          />
          <h2 class="mono-display !text-[46px] mb-5 items-center max-w-[440px]">
            Start a discussion
          </h2>
          <div class="max-w-[440px]">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
            eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim
            ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut
            aliquip ex ea commodo consequat.
          </div>
        </div>
      </div>
      <div class="text-md">
        <span
          class="font-heading rounded-full text-[22px] text-center py-1 mb-4 mr-2 inline-block justify-center items-center !size-[36px] bg-skin-link text-skin-bg"
          v-text="'2'"
        />
        <h2
          class="mono-display !text-[46px] mb-5 items-center mx-auto max-w-[440px]"
        >
          Gather community ideas
        </h2>
        <div class="max-w-[440px] mx-auto">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
          eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad
          minim veniam, quis nostrud exercitation ullamco laboris nisi ut
          aliquip ex ea commodo consequat.
        </div>
      </div>
      <div class="text-md">
        <span
          class="font-heading rounded-full text-[22px] text-center py-1 mb-4 mr-2 inline-block justify-center items-center !size-[36px] bg-skin-link text-skin-bg"
          v-text="'3'"
        />
        <h2
          class="mono-display !text-[46px] mb-5 items-center mx-auto max-w-[440px]"
        >
          Curate ideas at scale
        </h2>
        <div class="max-w-[440px] mx-auto">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
          eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad
          minim veniam, quis nostrud exercitation ullamco laboris nisi ut
          aliquip ex ea commodo consequat.
        </div>
      </div>
    </UiContainer>
  </div>
</template>
