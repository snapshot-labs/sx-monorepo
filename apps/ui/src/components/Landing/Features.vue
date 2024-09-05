<script setup lang="ts">
import ICDiscourse from '~icons/c/discourse';
import ISAdjustments from '~icons/heroicons-solid/adjustments';
import ISChip from '~icons/heroicons-solid/chip';
import ISColorSwatch from '~icons/heroicons-solid/color-swatch';
import ISCursorClick from '~icons/heroicons-solid/cursor-click';
import ISLightningBolt from '~icons/heroicons-solid/lightning-bolt';
import ISPlay from '~icons/heroicons-solid/play';
import ISShieldCheck from '~icons/heroicons-solid/shield-check';
import ISSparkles from '~icons/heroicons-solid/sparkles';

const FEATURES = [
  {
    title: '400+ voting strategies',
    about:
      'Over 400 customizable methods to calculate voting power based on tokens, staking, NFTs and more. Create your tailored governance system.',
    icon: ISChip
  },
  {
    title: 'Multiple voting systems',
    about:
      'Support single choice, approval, basic, weighted, quadratic, and ranked choice voting. Select the most suitable method for each decision.',
    icon: ISAdjustments
  },
  {
    title: 'Gasless governance',
    about:
      'Eliminate transaction fees, break participation barriers and encourage broader community involvement in governance.',
    icon: ISCursorClick
  },
  {
    title: 'Discourse integration',
    about:
      'View Discourse discussions and comments directly within Snapshot, enhancing context and facilitating informed voting decisions.',
    icon: ICDiscourse
  },
  {
    title: 'Delegates dashboard',
    about:
      'Enable users to delegate voting power to trusted representatives, allowing indirect participation in governance.',
    icon: ISLightningBolt
  },
  {
    title: 'Shielded voting',
    about:
      'Keep voter choices confidential until voting ends, preventing manipulation and promoting fair, unbiased outcomes.',
    icon: ISShieldCheck
  },
  {
    title: 'Execution with oSnap',
    about:
      'Allows offchain votes to trigger onchain transactions, enabling secure and decentralized decision enforcement.',
    icon: ISPlay
  },
  {
    title: 'AI proposal summary',
    about:
      'AI-generated concise overviews of proposals to help busy voters quickly understand key points for informed decision-making.',
    icon: ISSparkles
  },
  {
    title: 'Whitelabel',
    about:
      "Select your own branding options, creating a cohesive user experience aligned with your DAO's identity.",
    icon: ISColorSwatch
  }
];
</script>

<template>
  <div id="features" class="pt-8 border-b">
    <UiContainer class="!max-w-screen-lg">
      <div class="pb-6 max-w-[600px]">
        <div class="eyebrow mb-3">Features</div>
        <h1 class="mb-4 font-display !text-[44px]">
          Everything DAOs need to make better decisions together
        </h1>
      </div>
    </UiContainer>
    <div class="border-t">
      <UiContainer class="!max-w-screen-lg !px-0">
        <div class="grid grid-cols-1 lg:grid-cols-3">
          <div
            v-for="(feature, i) in FEATURES"
            :key="i"
            class="px-4 py-5 lg:h-[260px] border-b last:border-b-0 border-r-0 lg:border-r lg:[&:nth-child(3n)]:border-r-0 lg:[&:nth-child(n+7)]:border-b-0"
          >
            <component
              :is="feature.icon"
              class="text-skin-link size-[22px] mb-4"
            />
            <h3
              class="text-skin-link font-heading !text-[18px] mb-2"
              v-text="feature.title"
            />
            <div v-text="feature.about" />
          </div>
        </div>
      </UiContainer>
    </div>
  </div>
</template>
