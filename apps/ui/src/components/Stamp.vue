<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    type?: 'avatar' | 'space' | 'space-sx' | 'token';
    id: string;
    size?: number;
    cb?: string;
  }>(),
  {
    type: 'avatar',
    size: 22
  }
);

const src = computed(() => {
  const cacheParam = props.cb ? `&cb=${props.cb}` : '';
  return `https://cdn.stamp.fyi/${props.type}/${props.id}?s=${Number(props.size) * 2}${cacheParam}`;
});
</script>

<template>
  <img
    :src="src"
    class="rounded-full inline-block bg-[color:var(--border-color)]"
    :style="{
      width: `${size}px`,
      height: `${size}px`
    }"
  />
</template>
