import { Ref, toRef } from 'vue';
import { defineStore } from 'pinia';
import { currentNetwork } from '@/networks';
import type { Proposal } from '@/types';

type SpaceRecord = {
  loading: boolean;
  loadingMore: boolean;
  loaded: boolean;
  proposals: Proposal[];
  hasMoreProposals: boolean;
  summaryLoading: boolean;
  summaryLoaded: boolean;
  summaryProposals: Proposal[];
};

const PROPOSALS_LIMIT = 20;

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
    async fetch(spaceId: string) {
      if (!this.proposals[spaceId]) {
        this.proposals[spaceId] = {
          loading: false,
          loadingMore: false,
          loaded: false,
          proposals: [],
          hasMoreProposals: true,
          summaryLoading: false,
          summaryLoaded: false,
          summaryProposals: []
        };
      }

      const record = toRef(this.proposals, spaceId) as Ref<SpaceRecord>;
      if (record.value.loading || record.value.loaded) return;

      record.value.loading = true;

      const proposals = await currentNetwork.api.loadProposals(spaceId, { limit: PROPOSALS_LIMIT });

      record.value.proposals = proposals;
      record.value.hasMoreProposals = proposals.length === PROPOSALS_LIMIT;
      record.value.loaded = true;
      record.value.loading = false;
    },
    async fetchMore(spaceId: string) {
      if (!this.proposals[spaceId]) {
        this.proposals[spaceId] = {
          loading: false,
          loadingMore: false,
          loaded: false,
          proposals: [],
          hasMoreProposals: true,
          summaryLoading: false,
          summaryLoaded: false,
          summaryProposals: []
        };
      }

      const record = toRef(this.proposals, spaceId) as Ref<SpaceRecord>;
      if (record.value.loading || !record.value.loaded) return;

      record.value.loadingMore = true;

      const proposals = await currentNetwork.api.loadProposals(spaceId, {
        limit: PROPOSALS_LIMIT,
        skip: record.value.proposals.length
      });

      record.value.proposals = [...record.value.proposals, ...proposals];

      record.value.hasMoreProposals = proposals.length === PROPOSALS_LIMIT;
      record.value.loadingMore = false;
    },
    async fetchSummary(spaceId: string, limit = 3) {
      if (!this.proposals[spaceId]) {
        this.proposals[spaceId] = {
          loading: false,
          loadingMore: false,
          loaded: false,
          proposals: [],
          hasMoreProposals: true,
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
          loadingMore: false,
          loaded: false,
          proposals: [],
          hasMoreProposals: true,
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
