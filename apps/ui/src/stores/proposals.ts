import { Ref, toRef } from 'vue';
import { defineStore } from 'pinia';
import { currentNetwork } from '@/networks';
import type { Proposal } from '@/types';

type SpaceRecord = {
  loading: boolean;
  loaded: boolean;
  proposals: Proposal[];
  summaryLoading: boolean;
  summaryLoaded: boolean;
  summaryProposals: Proposal[];
};

export const useProposalsStore = defineStore('proposals', {
  state: () => ({
    proposals: {} as Partial<Record<string, SpaceRecord>>,
    summaryProposals: {} as Partial<Record<string, SpaceRecord>>
  }),
  getters: {
    getProposal: state => {
      return (spaceId: string, proposalId: number) => {
        const record = state.proposals[spaceId];
        if (!record) return undefined;

        return [...record.proposals, ...record.summaryProposals].find(
          proposal => proposal.proposal_id === proposalId
        );
      };
    }
  },
  actions: {
    async fetchAll(spaceId: string) {
      if (!this.proposals[spaceId]) {
        this.proposals[spaceId] = {
          loading: false,
          loaded: false,
          proposals: [],
          summaryLoading: false,
          summaryLoaded: false,
          summaryProposals: []
        };
      }

      const record = toRef(this.proposals, spaceId) as Ref<SpaceRecord>;
      if (record.value.loading || record.value.loaded) return;

      record.value.loading = true;

      record.value.proposals = await currentNetwork.api.loadProposals(spaceId, 5);
      record.value.loaded = true;
      record.value.loading = false;
    },
    async fetchSummary(spaceId: string, limit = 3) {
      if (!this.proposals[spaceId]) {
        this.proposals[spaceId] = {
          loading: false,
          loaded: false,
          proposals: [],
          summaryLoading: false,
          summaryLoaded: false,
          summaryProposals: []
        };
      }

      const record = toRef(this.proposals, spaceId) as Ref<SpaceRecord>;
      if (record.value.summaryLoading || record.value.summaryLoaded) {
        return;
      }

      record.value.summaryLoading = true;

      record.value.summaryProposals = await currentNetwork.api.loadProposalsSummary(spaceId, limit);
      record.value.summaryLoaded = true;
      record.value.summaryLoading = false;
    },
    async fetchProposal(spaceId: string, proposalId: number) {
      if (!this.proposals[spaceId]) {
        this.proposals[spaceId] = {
          loading: false,
          loaded: false,
          proposals: [],
          summaryLoading: false,
          summaryLoaded: false,
          summaryProposals: []
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
