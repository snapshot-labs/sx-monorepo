<template>
  <div id="ecosystem" class="py-9 border-b relative overflow-hidden">
    <UiContainer class="!max-w-screen-lg">
      <div class="max-w-[600px]">
        <div class="eyebrow mb-3">Ecosystem</div>
        <h1 class="mb-5 font-display !text-[44px]">
          Supercharge your governance with integrations
        </h1>
        <UiButton :to="{ name: 'site-ecosystem' }">
          Explore integrations
        </UiButton>
      </div>
    </UiContainer>
    <div
      class="absolute bottom-[-170px] md:top-6 left-[50%] -z-10 w-[506px] overflow-hidden text-center"
    >
      <img
        src="@/assets/integrations.png"
        alt="Ecosystem"
        class="w-[506px] inline-block"
      />
    </div>
  </div>
</template>
<script setup lang="ts"></script>
