import { Ref, toRef } from 'vue';
import { defineStore } from 'pinia';
import { currentNetwork } from '@/networks';
import type { Proposal } from '@/types';

type SpaceRecord = {
  loading: boolean;
  loaded: boolean;
  summaryLoading: boolean;
  summaryLoaded: boolean;
  proposals: Proposal[];
};

export const useProposalsStore = defineStore('proposals', {
  state: () => ({
    proposals: {} as Record<string, SpaceRecord | undefined>
  }),
  getters: {
    getProposal: state => {
      return (spaceId: string, proposalId: number) => {
        const proposals = state.proposals[spaceId]?.proposals ?? [];

        return proposals.find(proposal => proposal.proposal_id === proposalId);
      };
    }
  },
  actions: {
    async fetchAll(spaceId: string) {
      if (!this.proposals[spaceId]) {
        this.proposals[spaceId] = {
          loading: false,
          loaded: false,
          summaryLoading: false,
          summaryLoaded: false,
          proposals: []
        };
      }

      const record = toRef(this.proposals, spaceId) as Ref<SpaceRecord>;
      if (record.value.loading || record.value.loaded) return;

      record.value.loading = true;
      record.value.summaryLoading = true;

      record.value.proposals = await currentNetwork.api.loadProposals(spaceId, 5);
      record.value.loaded = true;
      record.value.summaryLoaded = true;
      record.value.loading = false;
      record.value.summaryLoading = false;
    },
    async fetchSummary(spaceId: string, limit = 3) {
      if (!this.proposals[spaceId]) {
        this.proposals[spaceId] = {
          loading: false,
          loaded: false,
          summaryLoading: false,
          summaryLoaded: false,
          proposals: []
        };
      }

      const record = toRef(this.proposals, spaceId) as Ref<SpaceRecord>;
      if (
        record.value.loading ||
        record.value.loaded ||
        record.value.summaryLoading ||
        record.value.summaryLoaded
      ) {
        return;
      }

      record.value.summaryLoading = true;

      const proposals = await currentNetwork.api.loadProposalsSummary(spaceId, limit);

      record.value.proposals = [
        ...record.value.proposals,
        ...proposals.filter(proposal => !this.getProposal(spaceId, proposal.proposal_id))
      ];

      record.value.summaryLoaded = true;
      record.value.summaryLoading = false;
    },
    async fetchProposal(spaceId: string, proposalId: number) {
      if (!this.proposals[spaceId]) {
        this.proposals[spaceId] = {
          loading: false,
          loaded: false,
          summaryLoading: false,
          summaryLoaded: false,
          proposals: []
        };
      }

      const record = toRef(this.proposals, spaceId) as Ref<SpaceRecord>;
      if (this.getProposal(spaceId, proposalId)) return;

      const proposal = await currentNetwork.api.loadProposal(spaceId, proposalId);

      if (this.getProposal(spaceId, proposalId)) return;
      record.value.proposals.push(proposal);
    }
  }
});
