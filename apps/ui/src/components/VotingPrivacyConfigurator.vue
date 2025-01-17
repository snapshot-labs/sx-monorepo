<script lang="ts" setup>
import UiSelector from '@/components/Ui/Selector.vue';
import { SpacePrivacy } from '@/types';
import IHCHeck from '~icons/heroicons-outline/check';
import IHUser from '~icons/heroicons-outline/user';
import IHX from '~icons/heroicons-outline/x';

const PRIVACY_TYPES = {
  any: {
    label: 'Up to the author',
    description:
      'Leave it to the proposal author whether to enable shielded voting.',
    icon: IHUser
  },
  shutter: {
    label: 'On',
    description: 'Votes will always stay private until proposal ends.',
    icon: IHCHeck
  },
  none: {
    label: 'Off',
    description: 'Votes will always be public.',
    icon: IHX
  }
} as const;

const privacy = defineModel<SpacePrivacy>();

function handleClick(value: string) {
  privacy.value = value as SpacePrivacy;
}
</script>

<template>
  <div>
    <h4 class="eyebrow">Shielded voting</h4>
    <div class="mb-3">
      Encrypt votes, making voter's choice private until the proposal ends.
    </div>
    <div class="space-y-3">
      <UiSelectorCard
        :is="UiSelector"
        v-for="(type, id) in PRIVACY_TYPES"
        :key="id"
        :item="{ ...type, key: id }"
        :selected="privacy === id"
        :is-active="privacy === id"
        @click="handleClick"
      />
    </div>
  </div>
</template>
