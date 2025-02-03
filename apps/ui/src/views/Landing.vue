<script setup lang="ts">
import { APP_NAME } from '@/helpers/constants';

useTitle(APP_NAME);
</script>

<template>
  <div class="relative">
    <LandingHero />
    <LandingUsers />
    <LandingCounter />
    <LandingFlow />
    <LandingFeatures />
    <LandingEcosystem />
    <LandingStart />
  </div>
</template>
