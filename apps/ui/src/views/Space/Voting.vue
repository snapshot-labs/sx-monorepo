<script setup>
defineProps({ space: Object });
</script>
<template>
  <Container>
    <h2 class="mb-3">Voting</h2>
    <div class="mb-2">
      <div class="s-label">Voting delay</div>
      <div class="text-skin-link">{{ space.voting_delay }}</div>
    </div>
    <div class="mb-2">
      <div class="s-label">Voting period</div>
      <div class="text-skin-link">{{ space.voting_period }}</div>
    </div>
    <div class="mb-2">
      <div class="s-label">Proposal threshold</div>
      <div class="text-skin-link">{{ space.proposal_threshold }}</div>
    </div>
  </Container>
</template>
