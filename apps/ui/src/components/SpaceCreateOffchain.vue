<script setup lang="ts">
import { NetworkID } from '@/types';

const { createSpaceRaw } = useActions();

const networkId = ref<NetworkID>('s');
const spaceId = ref<string>('');

async function create() {
  const result = await createSpaceRaw(
    networkId.value,
    spaceId.value,
    JSON.stringify({})
  );
}
</script>

<template>
  <div></div>
</template>
