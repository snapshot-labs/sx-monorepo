<template>
  <div class="relative">
    <div
      class="absolute z-10 top-0 bottom-0 left-0 w-[320px] max-w-[20%] bg-gradient-to-r from-skin-bg to-skin-bg/0"
    />
    <div
      class="absolute z-10 top-0 bottom-0 right-0 w-[320px] max-w-[20%] bg-gradient-to-l from-skin-bg to-skin-bg/0"
    />
    <div class="relative flex overflow-hidden">
      <div class="carousel flex">
        <slot />
      </div>
      <div class="carousel-follower flex">
        <slot />
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
$duration: 160s;

.carousel {
  animation: slide $duration linear infinite;
  animation-delay: calc($duration * -1);
}

.carousel-follower {
  animation: slide-follower $duration linear infinite;
  animation-delay: calc($duration / -2);
}

@keyframes slide {
  0% {
    transform: translateX(100%);
  }
  100% {
    transform: translateX(-100%);
  }
}

@keyframes slide-follower {
  100% {
    transform: translateX(-200%);
  }
}
</style>
