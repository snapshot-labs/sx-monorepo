<script lang="ts" setup>
const router = useRouter();
const { web3 } = useWeb3();

watch(
  () => web3.value.account,
  account => {
    if (!account) return;
    router.push({ name: 'my-home' });
  },
  { immediate: true }
);
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
