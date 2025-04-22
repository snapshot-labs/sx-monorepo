<script setup lang="ts">
const { setTitle } = useTitle();

watchEffect(() => setTitle('Townhall'));
</script>

<template>
  <div>
    <div class="py-8 bg-skin-border/40">
      <UiContainer class="pb-8 !max-w-[940px]">
        <div class="eyebrow mb-3">Townhall</div>
        <h1 class="mono-display">
          Think together,<br />
          spark changes
        </h1>
      </UiContainer>
    </div>
    <UiContainer class="!max-w-[940px] space-y-9 mb-10 text-center">
      <PulseTitleForm class="-mt-8 text-left !max-w-[710px]" />

      <div class="relative overflow-hidden">
        <div class="grid grid-cols-9 gap-4">
          <div class="col-span-5 text-md text-left">
            <div class="eyebrow mb-3">Step 1</div>
            <h2
              class="mono-display !text-[46px] mb-4 items-center max-w-[440px]"
            >
              Start a discussion
            </h2>
            <div class="max-w-[440px]">
              <div class="mb-2">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
                eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut
                enim ad minim veniam.
              </div>
              <div>
                <router-link :to="{ name: 'townhall-create' }">
                  Get started
                </router-link>
              </div>
            </div>
          </div>
          <div class="col-span-4 relative flex justify-end">
            <div class="mt-8">
              <div class="bg-[#fbe76b] h-[200px] w-[340px] rounded-lg" />
            </div>
          </div>
        </div>
      </div>

      <div class="relative overflow-hidden">
        <div class="grid grid-cols-9 gap-4">
          <div class="col-span-4 relative flex justify-start">
            <div class="mt-8">
              <div class="bg-[#fbe76b] h-[200px] w-[340px] rounded-lg" />
            </div>
          </div>
          <div class="col-span-5 text-md text-left">
            <div class="eyebrow mb-3">Step 2</div>
            <h2
              class="mono-display !text-[46px] mb-4 items-center max-w-[440px]"
            >
              Gather community ideas
            </h2>
            <div class="max-w-[440px]">
              <div class="mb-2">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
                eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut
                enim ad minim veniam.
              </div>
              <div>
                <router-link
                  :to="{ name: 'townhall-discussion', params: { id: 1 } }"
                >
                  Try demo discussion
                </router-link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="relative overflow-hidden">
        <div class="grid grid-cols-9 gap-4">
          <div class="col-span-5 text-md text-left">
            <div class="eyebrow mb-3">Step 3</div>
            <h2
              class="mono-display !text-[46px] mb-4 items-center max-w-[440px]"
            >
              Curate ideas at scale
            </h2>
            <div class="max-w-[440px]">
              <div class="mb-2">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
                eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut
                enim ad minim veniam.
              </div>
              <div>
                <router-link
                  :to="{ name: 'townhall-discussion', params: { id: 1 } }"
                >
                  See example discussion
                </router-link>
              </div>
            </div>
          </div>
          <div class="col-span-4 relative flex justify-end">
            <div class="mt-8">
              <div class="bg-[#fbe76b] h-[200px] w-[340px] rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    </UiContainer>
  </div>
</template>
