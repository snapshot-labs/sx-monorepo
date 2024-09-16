<script setup lang="ts">
import { getUrl } from '@/helpers/utils';

useTitle('Network');

const CUSTOMERS = [
  {
    name: 'Blast',
    avatar:
      'ipfs://bafkreicqhrimt2zyp2kvhmbpvffxlmxovkg5vw6zkissyzibcfy45kbvrm',
    website: 'https://blast.io'
  },
  {
    name: 'Starknet',
    avatar:
      'ipfs://bafkreib5g7a6ufzpo5ebeosetgzoy5geduwcgmch7vighsbasth3wty77q',
    website: 'https://starknet.io'
  },
  {
    name: 'Linea',
    avatar:
      'ipfs://bafkreihtyzolub3sejuwc32hpdpjnt7ksowaguni2yuho3kyihhcqrtqce',
    website: 'https://linea.build'
  },
  {
    name: 'Merlin',
    avatar:
      'ipfs://bafkreicew2qv3m756m7xs2nrjezinghps7rlessrqjqetvox74w4hov2xe',
    website: 'https://merlinchain.io'
  },
  {
    name: 'Immutable zkEVM',
    avatar:
      'ipfs://bafkreiepnhfv3hgexddjpyaeemxo3byhtxxit6t4zsponyczee6ddjqxwi',
    website: 'https://www.immutable.com'
  },
  {
    name: 'Cyber',
    avatar:
      'ipfs://bafkreifm2bbehoqpz4454o7gixnxfi6cgvqlxigqr3f6ipj7l2omtgfgnm',
    website: 'https://cyber.co'
  },
  {
    name: 'Sei',
    avatar:
      'ipfs://bafkreiammyt7uztbztqbcqv4bydnczsh2fqmnjf6jxj4xnskzzl6sjrigq',
    website: 'https://www.sei.io'
  },
  {
    name: 'Gravity',
    avatar:
      'ipfs://bafkreia7lrda6v2fc5dthazn3qdost4yd2qrn3r4ntrd6lgmc2gvtvvhoa',
    website: 'https://gravity.xyz'
  },
  {
    name: 'zkLink',
    avatar: 'bafkreic6c3iems5235qapyhyrygha7akqrsfact2nok3y2uhljpzxrdu74',
    website: 'https://zklink.io'
  },
  {
    name: 'ApeChain',
    avatar:
      'ipfs://bafkreicljxttjq2xkgfwwpii5xegirgq2ctrnsjnzelxudjj33qzq65apu',
    website: 'https://apechain.com'
  },
  {
    name: 'Fantom',
    avatar: 'ipfs://QmVEgNeQDKnXygeGxfY9FywZpNGQu98ktZtRJ9bToYF6g7',
    website: 'https://fantom.foundation'
  }
];
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
          <h3 class="font-display mb-3">Basic plan</h3>
          <div class="text-left">
            <div>
              <IH-check class="inline-block text-skin-success mr-2" />
              Mainnet network support
            </div>
            <div>
              <IH-check class="inline-block text-skin-success mr-2" />
              Custom domain registry support
            </div>
            <div>
              <IH-check class="inline-block text-skin-success mr-2" />
              Dedicated customer support
            </div>
            <div>
              <IH-check class="inline-block text-skin-success mr-2" />
              Quick setup (~48 hours)
            </div>
            <div>
              <IH-check class="inline-block text-skin-success mr-2" />
              Co-marketing
            </div>
          </div>
        </div>

        <div>
          <h3 class="font-display mb-3">Premium plan</h3>
          <div class="text-left">
            <div>
              <IH-check class="inline-block text-skin-success mr-2" />
              Snapshot X integration
            </div>
            <div>
              <IH-check class="inline-block text-skin-success mr-2" />
              Support for Safe voting
            </div>
            <div>
              <IH-check class="inline-block text-skin-success mr-2" />
              Support for delegate registry
            </div>
            <div>
              <IH-check class="inline-block text-skin-success mr-2" />
              Testnet network support
            </div>
          </div>
        </div>
      </div>
    </UiContainer>

    <div class="text-center">
      <div class="eyebrow mb-4">Trusted by</div>
      <UiScrollerHorizontal>
        <div class="w-fit mx-auto px-4">
          <div class="grid grid-flow-col auto-cols-max justify-center gap-4">
            <a
              v-for="(customer, i) in CUSTOMERS"
              :key="i"
              target="_blank"
              :href="customer.website"
            >
              <img
                :alt="customer.name"
                :src="getUrl(customer.avatar) ?? undefined"
                class="size-[54px] rounded-lg"
              />
            </a>
          </div>
        </div>
      </UiScrollerHorizontal>
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
          <h3 class="py-3 flex-auto">
            {{ question.question }}
          </h3>
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
