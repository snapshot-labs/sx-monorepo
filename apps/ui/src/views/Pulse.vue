<script setup lang="ts">
const title = ref('');
const discussion = ref('');
const statement = {
  id: 1,
  text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
  agree: 90,
  disagree: 1,
  pass: 0
};
</script>

<template>
  <div>
    <div class="py-8">
      <UiContainer class="pb-8 !max-w-[990px]">
        <div class="eyebrow mb-3">Townhall</div>
        <h2 class="mono-display">
          Think together,<br />
          spark changes
        </h2>
      </UiContainer>
    </div>
    <UiContainer class="!max-w-[990px] space-y-9 mb-10 text-center">
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
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
              eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut
              enim ad minim veniam.
              <div>
                <router-link :to="{ name: 'pulse-create' }">
                  Get started
                </router-link>
              </div>
            </div>
          </div>
          <div class="col-span-4 relative flex items-center">
            <div
              class="absolute left-0 right-0 bottom-0 top-0 z-10 bg-gradient-to-r from-transparent to-skin-bg"
            />
            <div class="-mr-[600px] mt-6">
              <PulseTitleForm />
            </div>
          </div>
        </div>
      </div>

      <div class="relative overflow-hidden">
        <div class="grid grid-cols-9 gap-4">
          <div class="col-span-5 text-md text-left">
            <div class="eyebrow mb-3">Step 2</div>
            <h2
              class="mono-display !text-[46px] mb-4 items-center max-w-[440px]"
            >
              Gather community ideas
            </h2>
            <div class="max-w-[440px]">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
              eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut
              enim ad minim veniam.
              <div>
                <router-link
                  :to="{ name: 'pulse-discussion', params: { id: 1 } }"
                >
                  Try demo discussion
                </router-link>
              </div>
            </div>
          </div>
          <div class="col-span-4 relative flex items-center">
            <div
              class="absolute left-0 right-0 bottom-0 top-0 z-10 bg-gradient-to-l from-skin-bg to-transparent"
            />
            <div class="-mr-[180px] mt-6">
              <IC-pulse class="size-[500px] text-skin-link/20" />
              <PulseStatements :statements="[]" class="text-left" />
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
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
              eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut
              enim ad minim veniam.
              <div>
                <router-link
                  :to="{ name: 'pulse-discussion', params: { id: 1 } }"
                >
                  See example discussion
                </router-link>
              </div>
            </div>
          </div>
          <div class="col-span-4 relative flex items-center">
            <div
              class="absolute left-0 right-0 bottom-0 top-0 z-10 bg-gradient-to-r from-transparent to-skin-bg"
            />
            <div class="-mr-[140px] mt-6">
              <PulseStatementItem :statement="statement" class="text-left" />
            </div>
          </div>
        </div>
      </div>
    </UiContainer>
  </div>
</template>
