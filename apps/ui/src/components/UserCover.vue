<script setup lang="ts">
import { getCacheHash, getStampUrl } from '@/helpers/utils';

const props = defineProps<{
  user: {
    id: string;
    avatar?: string;
    cover?: string;
  };
}>();

const cb = computed(() => getCacheHash(props.user.cover));
</script>

<template>
  <UiStamp
    v-if="user.cover"
    :id="user.id"
    :width="1500"
    :height="156"
    :cb="cb"
    type="user-cover"
    class="object-cover"
  />
  <div
    v-else
    class="bg-cover bg-center w-full h-full"
    :style="{
      'background-image': `url(${getStampUrl(
        'avatar',
        user.id,
        50,
        getCacheHash(user.avatar)
      )}`,
      filter: `blur(100px) contrast(0.9) saturate(1.3)`
    }"
  />
</template>
