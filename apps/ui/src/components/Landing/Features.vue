<script setup lang="ts">
import IHAdjustments from '~icons/heroicons-outline/adjustments';
import IHAnnotation from '~icons/heroicons-outline/annotation';
import IHChip from '~icons/heroicons-outline/chip';
import IHCollection from '~icons/heroicons-outline/collection';
import IHColorSwatch from '~icons/heroicons-outline/color-swatch';
import IHCursorClick from '~icons/heroicons-outline/cursor-click';
import IHHand from '~icons/heroicons-outline/hand';
import IHLibrary from '~icons/heroicons-outline/library';
import IHLightningBolt from '~icons/heroicons-outline/lightning-bolt';
import IHPlay from '~icons/heroicons-outline/play';
import IHShieldCheck from '~icons/heroicons-outline/shield-check';
import IHSparkles from '~icons/heroicons-outline/sparkles';

const FEATURES = [
  {
    title: 'Voting strategies',
    about:
      'Over 400 customizable methods to calculate voting power based on tokens, staking, or NFTs. DAOs can create tailored governance systems.',
    icon: IHChip
  },
  {
    title: 'Voting systems',
    about:
      'Supports single choice, approval, basic, weighted, quadratic, and ranked choice voting. DAOs can select the most suitable method for each decision.',
    icon: IHAdjustments
  },
  {
    title: 'Gasless voting',
    about:
      'Eliminates transaction fees, lowering participation barriers and encouraging broader community involvement in governance.',
    icon: IHCursorClick
  },
  {
    title: 'Proposal validation',
    about:
      'Customizable rules determine who can submit proposals, ensuring only qualified users contribute to governance discussions.',
    icon: IHLibrary
  },
  {
    title: 'Discourse integration',
    about:
      'View Discourse discussions and comments directly within Snapshot, enhancing context and facilitating informed voting decisions.',
    icon: IHAnnotation
  },
  {
    title: 'Whitelabel',
    about:
      "Offers a whitelabel solution with branding options, creating a cohesive user experience aligned with the DAO's identity.",
    icon: IHColorSwatch
  },
  {
    title: 'Optimistic quorum',
    about:
      'Streamlines decision-making by assuming proposal approval unless challenged, reducing the need for voting on uncontroversial matters.',
    icon: IHHand
  },
  {
    title: 'Draft system',
    about:
      'Allows proposal drafts for community review, helping refine ideas and gather feedback before formal submission.',
    icon: IHCollection
  },
  {
    title: 'Delegates dashboard',
    about:
      'Enables users to delegate voting power to trusted representatives, ensuring indirect participation in governance.',
    icon: IHLightningBolt
  },
  {
    title: 'Shielded voting',
    about:
      'Keeps voter choices confidential until voting ends, preventing manipulation and ensuring fair, unbiased outcomes.',
    icon: IHShieldCheck
  },
  {
    title: 'Execution with oSnap',
    about:
      'Allows offchain votes to trigger onchain transactions, enabling secure and decentralized decision enforcement.',
    icon: IHPlay
  },
  {
    title: 'AI proposal summary',
    about:
      'Provides AI-generated concise overviews of proposals, helping voters quickly understand key points for informed decision-making.',
    icon: IHSparkles
  }
];
</script>

<template>
  <div id="features" class="pt-8 border-b">
    <UiContainer class="!max-w-[1060px]">
      <div class="pb-6 max-w-[600px]">
        <div class="eyebrow mb-3">Features</div>
        <h1 class="mb-4 mono !text-[44px]">
          Everything DAOs needs to make better decisions together
        </h1>
      </div>
    </UiContainer>
    <div class="border-t">
      <UiContainer class="!max-w-[1060px]">
        <div class="grid grid-cols-3 border-x">
          <div
            v-for="(feature, i) in FEATURES"
            :key="i"
            class="border-r border-b p-4 h-[240px]"
            :class="{
              'border-r-0': (i + 1) % 3 === 0,
              'border-b-0': i >= FEATURES.length - 3
            }"
          >
            <component :is="feature.icon" class="inline-block mb-3" />
            <h3 class="text-skin-link mb-1" v-text="feature.title" />
            <div class="" v-text="feature.about" />
          </div>
        </div>
      </UiContainer>
    </div>
  </div>
</template>
