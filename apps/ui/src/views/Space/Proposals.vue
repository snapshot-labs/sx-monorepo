<script setup>
import proposals from '@/helpers/proposals.json';
</script>

<template>
  <Container slim class="space-y-3">
    <Proposal
      v-for="(proposal, i) in proposals"
      :key="i"
      :proposal="proposal"
      class="x-block"
    />
  </Container>
</template>
