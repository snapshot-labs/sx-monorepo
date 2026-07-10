<script setup lang="ts">
import {
  getOrgProposalLabel,
  getOrgProposalSpaces
} from '@/helpers/organizations';
import { Space } from '@/types';
import SpaceProposals from '@/views/Space/Proposals.vue';

const props = defineProps<{ space: Space }>();

const { organization } = useOrganization();

const groupSpaces = computed(() =>
  getOrgProposalSpaces(organization.value, props.space.network)
);

function getTitle(selectedSpace: Space | null) {
  return getOrgProposalLabel(
    organization.value,
    selectedSpace ? `${props.space.network}:${selectedSpace.id}` : undefined
  );
}
</script>

<template>
  <SpaceProposals
    :space="space"
    :group-spaces="groupSpaces"
    :get-title="getTitle"
  />
</template>
