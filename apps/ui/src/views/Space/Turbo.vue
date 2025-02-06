<script setup lang="ts">
import { _n } from '@/helpers/utils';
import { Space } from '@/types';

const props = defineProps<{ space: Space }>();

const { setTitle } = useTitle();

const FEATURES = [
  {
    name: 'Daily proposals',
    basic: 10,
    turbo: 40,
    custom: '∞'
  },
  {
    name: 'Monthly proposals',
    basic: 50,
    turbo: 200,
    custom: '∞'
  },
  {
    name: 'Proposal character limit',
    basic: 10000,
    turbo: 50000,
    custom: '∞'
  },
  {
    name: 'Choices',
    basic: 6,
    turbo: 1000,
    custom: '∞'
  },
  {
    name: 'Voting strategies',
    basic: 6,
    turbo: 10,
    custom: '∞'
  },
  {
    name: 'Featured on explore page',
    basic: false,
    turbo: true,
    custom: true
  },
  {
    name: 'Delegates dashboard',
    basic: false,
    turbo: true,
    custom: true
  },
  {
    name: 'Whitelabel',
    basic: false,
    turbo: true,
    custom: true
  },
  {
    name: 'Priority support',
    basic: false,
    turbo: true,
    custom: true
  },
  {
    name: 'Early access to new features',
    basic: false,
    turbo: true,
    custom: true
  },
  {
    name: 'Custom interface',
    basic: false,
    turbo: false,
    custom: true
  },
  {
    name: 'Price (monthly)',
    basic: 'Free',
    turbo: '600 USDC',
    custom: 'Contact us'
  },
  {
    name: 'Price (yearly)',
    basic: 'Free',
    turbo: '6,000 USDC',
    custom: 'Contact us'
  }
];

watchEffect(() => setTitle(`Plans - ${props.space.name}`));
</script>

<template>
  <div class="space-y-4">
    <div class="bg-skin-border p-4 mb-4">
      <IC-turbo class="text-skin-link mb-6" />
      <h2>Supercharge your governance</h2>
    </div>
    <div>
      <div class="bg-skin-bg border-b flex w-full font-medium px-4">
        <div class="flex-grow">Feature</div>
        <div class="w-[120px] text-center md:block hidden">Basic</div>
        <div class="w-[120px] text-center">Turbo</div>
        <div class="w-[120px] text-center">Custom</div>
      </div>
      <div
        v-for="(feature, i) in FEATURES"
        :key="i"
        class="border-b mx-4 py-[14px] flex text-skin-link"
      >
        <div class="flex-grow" v-text="feature.name" />
        <div
          v-for="(plan, i2) in ['basic', 'turbo', 'custom']"
          :key="i2"
          class="w-[120px] text-center"
          :class="plan === 'basic' && 'md:block hidden'"
        >
          <template v-if="typeof feature[plan] === 'boolean'">
            <IH-check
              v-if="feature[plan]"
              class="text-skin-success inline-block"
            />
            <IH-minus-sm v-else class="text-skin-text inline-block" />
          </template>
          <template v-else-if="typeof feature[plan] === 'number'">
            {{ _n(feature[plan]) }}
          </template>
          <template v-else>
            {{ feature[plan] }}
          </template>
        </div>
      </div>
    </div>
    <div class="px-4">
      <div
        class="border rounded-lg px-4 py-3 flex justify-between items-center"
      >
        <h3>Your organization deserve the best.</h3>
        <UiButton class="primary">Upgrade</UiButton>
      </div>
    </div>
  </div>
</template>
