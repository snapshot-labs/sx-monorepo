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
        <linearGradient id="gradient" x1="28.154%" y1="63.74%" x2="74.629%" y2="17.783%">
          <stop stop-color="#000000" offset="0%"></stop>
          <stop stop-opacity="0" offset="100%"></stop>
        </linearGradient>
      </defs>
      <g transform="translate(2)" fill="none" fill-rule="evenodd">
        <circle stroke="url(#gradient)" stroke-width="4" cx="10" cy="12" r="10"></circle>
        <path d="M10 2C4.477 2 0 6.477 0 12" stroke="#000000" stroke-width="4"></path>
        <rect x="8" width="4" height="4" rx="8"></rect>
      </g>
      <animateTransform
        attributeName="transform"
        type="rotate"
        from="0 0 0"
        to="360 0 0"
        dur="0.5s"
        repeatCount="indefinite"
      />
    </svg>
  </span>
</template>

<style lang="scss">
.loading {
  svg {
    path {
      stroke: rgba(var(--link));
    }

    stop {
      stop-color: rgba(var(--link));
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
    width: 24px;
    height: 24px;
  }

  &.overlay {
    position: fixed;
    text-align: center;
    display: flex;
    align-items: center;
    align-content: center;
    top: 0;
    bottom: 80px;
    left: 0;
    right: 0;
    width: 100%;
  }
}
</style>
