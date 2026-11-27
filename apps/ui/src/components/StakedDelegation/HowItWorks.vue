<script setup lang="ts">
import IHShieldCheck from '~icons/heroicons-outline/shield-check';
import IHSwitchHorizontal from '~icons/heroicons-outline/switch-horizontal';
import IHUserGroup from '~icons/heroicons-outline/user-group';

const STEPS = [
  {
    icon: IHUserGroup,
    title: 'Your validator votes by default',
    body: 'If you do nothing, the validator you stake with votes with your staked STRK. Your stake and rewards are not affected.'
  },
  {
    icon: IHSwitchHorizontal,
    title: 'Opt out at any time',
    body: 'Keep your own vote, or give it to any other address. One choice covers all of your pools. You can change it or reset it whenever you like.'
  },
  {
    icon: IHShieldCheck,
    title: 'Validators stay in control',
    body: 'Validators can name a separate address to vote with, or decline default delegations so their delegators keep their own vote.'
  }
];
</script>

<template>
  <div class="grid gap-3 md:grid-cols-3">
    <div
      v-for="(step, i) in STEPS"
      :key="step.title"
      class="border rounded-lg p-4 flex flex-col gap-2.5"
    >
      <div class="flex items-center justify-between">
        <div
          class="size-[40px] rounded-full bg-skin-border flex items-center justify-center text-skin-link"
        >
          <component :is="step.icon" class="size-[20px]" />
        </div>
        <span class="text-skin-text text-sm font-medium">0{{ i + 1 }}</span>
      </div>
      <h4 class="text-skin-heading leading-6" v-text="step.title" />
      <p class="text-skin-text text-[16px] leading-6" v-text="step.body" />
    </div>
  </div>
</template>
