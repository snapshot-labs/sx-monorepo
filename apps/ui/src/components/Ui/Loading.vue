<script setup lang="ts">
withDefaults(
  defineProps<{
    inverse?: boolean;
    width?: number;
    height?: number;
  }>(),
  {
    inverse: false,
    width: 20,
    height: 20
  }
);
</script>

<template>
  <span class="loading" :class="{ inverse: !!inverse }">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      :width="width"
      :height="height"
      class="inline-block align-middle"
      viewBox="0 0 24 24"
    >
      <defs>
        <linearGradient
          id="gradient"
          x1="28.154%"
          y1="63.74%"
          x2="74.629%"
          y2="17.783%"
        >
          <stop stop-color="#000000" offset="0%"></stop>
          <stop stop-opacity="0" offset="100%"></stop>
        </linearGradient>
      </defs>
      <g transform="translate(2)" fill="none" fill-rule="evenodd">
        <circle
          stroke="url(#gradient)"
          stroke-width="4"
          cx="10"
          cy="12"
          r="10"
        ></circle>
        <path
          d="M10 2C4.477 2 0 6.477 0 12"
          stroke="#000000"
          stroke-width="4"
        ></path>
        <rect x="8" width="4" height="4" rx="8"></rect>
      </g>
    </svg>
  </span>
</template>

<style lang="scss" scoped>
.loading {
  svg {
    animation: rotation 0.5s linear infinite;

    path {
      stroke: rgba(var(--link));
    }

    stop {
      stop-color: rgba(var(--link));
    }

    @keyframes rotation {
      0% {
        transform: rotate(0deg);
      }
      100% {
        transform: rotate(360deg);
      }
    }
  }

  &.inverse svg {
    path {
      stroke: rgba(var(--bg));
    }

    stop {
      stop-color: rgba(var(--bg));
    }
  }

  &.big svg {
    @apply size-[24px];
  }

  &.overlay {
    @apply fixed flex items-center justify-center inset-0;
  }
}
</style>
