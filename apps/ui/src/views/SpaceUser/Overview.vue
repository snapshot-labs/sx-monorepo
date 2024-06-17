<script setup lang="ts">
import { Space, Statement } from '@/types';

defineProps<{ space: Space; statement: Statement }>();
</script>

<template>
  <div class="m-4 text-skin-heading">{{ statement.statement }}</div>
</template>
