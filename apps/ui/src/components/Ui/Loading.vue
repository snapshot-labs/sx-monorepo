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
  <span class="loading">
    <span>
      <svg xmlns="http://www.w3.org/2000/svg" :width="width" :height="height" viewBox="0 0 50 50">
        <path
          :class="{ inverse: !!inverse }"
          d="M25,5A20.14,20.14,0,0,1,45,22.88a2.51,2.51,0,0,0,2.49,2.26h0A2.52,2.52,0,0,0,50,22.33a25.14,25.14,0,0,0-50,0,2.52,2.52,0,0,0,2.5,2.81h0A2.51,2.51,0,0,0,5,22.88,20.14,20.14,0,0,1,25,5Z"
        >
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 25 25"
            to="360 25 25"
            dur="0.5s"
            repeatCount="indefinite"
          />
        </path>
      </svg>
    </span>
  </span>
</template>

<style lang="scss">
.loading {
  span {
    width: 100%;
  }

  svg {
    display: inline-block;
    vertical-align: middle;

    path {
      fill: rgba(var(--link));
      &.inverse {
        fill: rgba(var(--bg));
      }
    }
  }

  &.big {
    svg {
      width: 24px;
      height: 24px;
    }
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
