<script setup>
import proposals from '@/helpers/proposals.json';
</script>

<template>
  <Container class="pb-6">
    <Proposal
      v-for="(proposal, i) in proposals"
      :key="i"
      :proposal="proposal"
      class="x-block mb-3"
    />
  </Container>
</template>
