<script setup>
import { _d } from '@/helpers/utils';

defineProps({ space: Object });
</script>

<template>
  <Container>
    <h2 class="mb-3">Voting</h2>
    <div class="mb-2">
      <div class="s-label">Voting delay</div>
      <div
        class="text-skin-link"
        v-text="_d(space.voting_delay) || 'No delay'"
      />
    </div>
    <div class="mb-2">
      <div class="s-label">Min. voting period</div>
      <div
        class="text-skin-link"
        v-text="_d(space.min_voting_period) || 'No min.'"
      />
    </div>
    <div class="mb-2">
      <div class="s-label">Max. voting period</div>
      <div class="text-skin-link" v-text="_d(space.max_voting_period)" />
    </div>
    <div class="mb-2">
      <div class="s-label">Proposal threshold</div>
      <div class="text-skin-link" v-text="space.proposal_threshold" />
    </div>
    <div class="mb-2">
      <div class="s-label">Quorum</div>
      <div class="text-skin-link" v-text="space.quorum" />
    </div>
  </Container>
</template>
