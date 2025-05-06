<script setup lang="ts">
useTitle('Network');

const FAQ = [
  {
    question: 'What payment methods does Snapshot accept?',
    answer: 'Snapshot accepts payments in USDC, USDT, DAI, and GHO stablecoins.'
  },
  {
    question: 'What are the requirements to add a network?',
    answer:
      'To add a network on Snapshot, it must be EVM compatible. Additionally, a full archive node is required to calculate voting power at a specific block. Snapshot can use node providers to meet this requirement and ensure smooth integration and functionality.'
  },
  {
    question: 'How to add a network that is not EVM compatible?',
    answer:
      'Adding a non-EVM network is possible under certain conditions. Please contact us for more details.'
  }
];

const LINK = 'https://tally.so/r/31ApGb';

const currentQuestion = ref();

function toggleQuestion(id) {
  currentQuestion.value = currentQuestion.value === id ? '' : id;
}
</script>
<template>
  <div class="space-y-[80px] pt-12 mb-8 blocks">
    <div class="py-8 text-center">
      <UiContainer class="!max-w-[880px] my-1">
        <h1 class="mb-6 font-display max-w-[600px] mx-auto text-[46px]">
          Unlock governance for your ecosystem
        </h1>
        <a
          :href="LINK"
          target="_blank"
          class="px-4 py-3 space-x-2 bg-skin-link text-skin-bg rounded-full"
        >
          Talk to sales
          <IH-arrow-sm-right class="inline-block -rotate-45" />
        </a>
      </UiContainer>
    </div>

    <UiContainer class="!max-w-[880px] text-center">
      <div class="eyebrow mb-2">Key features</div>
      <h2 class="font-display text-[36px] mb-3">
        What the network plan offers
      </h2>
      <div class="text-[21px] mb-5 max-w-[500px] mx-auto">
        Our network plan is designed to provide the infrastructure and support
        needed for effective governance.
      </div>
      <div
        class="text-skin-link text-lg space-y-4 px-5 py-4 text-left border rounded-lg max-w-[500px] mx-auto"
      >
        <div>
          <h3 class="font-display mb-3">Premium plan</h3>
          <div class="text-left">
            <div>
              <IH-check class="inline-block text-skin-success mr-2" />
              Mainnet network support
            </div>
            <div>
              <IH-check class="inline-block text-skin-success mr-2" />
              Testnet network support
            </div>
            <div>
              <IH-check class="inline-block text-skin-success mr-2" />
              Dedicated support
            </div>
            <div>
              <IH-check class="inline-block text-skin-success mr-2" />
              Quick setup (~48 hours)
            </div>
            <div>
              <IH-check class="inline-block text-skin-success mr-2" />
              1 Snapshot Pro space
            </div>
            <div>
              <IH-check class="inline-block text-skin-success mr-2" />
              Co-marketing
            </div>
          </div>
        </div>

        <div>
          <h3 class="font-display mb-3">Platinum plan</h3>
          <div class="text-left">
            <div>
              <IH-check class="inline-block text-skin-success mr-2" />
              Everything from Premium plan
            </div>
            <div>
              <IH-check class="inline-block text-skin-success mr-2" />
              Snapshot X integration
            </div>
          </div>
        </div>
      </div>
    </UiContainer>

    <div class="text-center">
      <div class="eyebrow mb-4">Trusted by</div>
      <UiCarousel>
        <div class="customer">
          <IC-blast />
        </div>
        <div class="customer">
          <IC-gravity />
        </div>
        <div class="customer">
          <IC-linea />
        </div>
        <div class="customer">
          <IC-optimism />
        </div>
        <div class="customer">
          <IC-sei />
        </div>
        <div class="customer">
          <IC-sonic />
        </div>
        <div class="customer">
          <IC-immutable />
        </div>
        <div class="customer">
          <IC-zklink />
        </div>
        <div class="customer">
          <IC-manta />
        </div>
        <div class="customer">
          <IC-bnb />
        </div>
        <div class="customer">
          <IC-base />
        </div>
        <div class="customer">
          <IC-snaxchain />
        </div>
        <div class="customer">
          <IC-starkware />
        </div>
      </UiCarousel>
    </div>

    <UiContainer class="!max-w-[880px] text-center">
      <div class="eyebrow mb-2">Get started</div>
      <h2 class="font-display text-[36px] mb-5">Get network support today</h2>
      <a
        :href="LINK"
        target="_blank"
        class="px-4 py-3 space-x-2 bg-skin-link text-skin-bg rounded-full"
      >
        Talk to sales
        <IH-arrow-sm-right class="inline-block -rotate-45" />
      </a>
    </UiContainer>

    <UiContainer class="!max-w-[880px]">
      <div class="border p-4 rounded-lg">
        <h3 class="mb-1">
          <IH-exclamation-circle class="inline-block mr-1" />
          Is your network already live on Snapshot?
        </h3>
        <div class="text-md">
          All networks must subscribe to the network plan to maintain support on
          Snapshot. To ensure continuous service and avoid interruptions, please
          contact our team today.
        </div>
      </div>
    </UiContainer>

    <UiContainer class="!max-w-[880px]">
      <div class="mb-2 eyebrow text-center">Frequently asked questions</div>
      <h2 class="text-[36px] font-display mb-5 text-center">Questions?</h2>
      <div v-for="(question, i) in FAQ" :key="i" class="border-b">
        <button
          type="button"
          class="flex items-center w-full text-left"
          @click="toggleQuestion(i)"
        >
          <h3 class="py-3 flex-auto h3" v-text="question.question" />
          <IH-minus-sm v-if="currentQuestion === i" class="text-skin-text" />
          <IH-plus-sm v-else class="text-skin-text" />
        </button>
        <div v-if="currentQuestion === i" class="text-[21px] pb-4 -mt-1">
          {{ question.answer }}
        </div>
      </div>
    </UiContainer>
  </div>
</template>

<style lang="scss" scoped>
.customer {
  @apply text-center w-[140px] h-[40px] mx-4 my-2 inline-block items-center justify-center;

  svg {
    @apply w-[140px] h-[40px] object-contain;
  }
}
</style>
