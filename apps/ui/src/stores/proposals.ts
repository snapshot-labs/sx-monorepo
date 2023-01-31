import { Ref, toRef } from 'vue';
import { defineStore } from 'pinia';
import { getNetwork } from '@/networks';
import type { NetworkID, Proposal } from '@/types';

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

// TODO: create special _id that is used for UI that is prefixed by networkId
const getUniqueSpaceId = (spaceId: string, networkId: NetworkID) => `${networkId}:${spaceId}`;

export const useProposalsStore = defineStore('proposals', {
  state: () => ({
    proposals: {} as Partial<Record<string, SpaceRecord>>
  }),
  getters: {
    getProposal: state => {
      return (spaceId: string, proposalId: number, networkId: NetworkID) => {
        const record = state.proposals[getUniqueSpaceId(spaceId, networkId)];
        if (!record) return undefined;

        return [...record.proposals, ...record.summaryProposals].find(
          proposal => proposal.proposal_id === proposalId
        );
      };
    }
  },
  actions: {
    async fetch(spaceId: string, networkId: NetworkID) {
      const uniqueSpaceId = getUniqueSpaceId(spaceId, networkId);

      if (!this.proposals[uniqueSpaceId]) {
        this.proposals[uniqueSpaceId] = {
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

      const record = toRef(this.proposals, uniqueSpaceId) as Ref<SpaceRecord>;
      if (record.value.loading || record.value.loaded) return;

      record.value.loading = true;

      const proposals = await getNetwork(networkId).api.loadProposals(spaceId, {
        limit: PROPOSALS_LIMIT
      });

      record.value.proposals = proposals;
      record.value.hasMoreProposals = proposals.length === PROPOSALS_LIMIT;
      record.value.loaded = true;
      record.value.loading = false;
    },
    async fetchMore(spaceId: string, networkId: NetworkID) {
      const uniqueSpaceId = getUniqueSpaceId(spaceId, networkId);

      if (!this.proposals[uniqueSpaceId]) {
        this.proposals[uniqueSpaceId] = {
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

      const record = toRef(this.proposals, uniqueSpaceId) as Ref<SpaceRecord>;
      if (record.value.loading || !record.value.loaded) return;

      record.value.loadingMore = true;

      const proposals = await getNetwork(networkId).api.loadProposals(spaceId, {
        limit: PROPOSALS_LIMIT,
        skip: record.value.proposals.length
      });

      record.value.proposals = [...record.value.proposals, ...proposals];

      record.value.hasMoreProposals = proposals.length === PROPOSALS_LIMIT;
      record.value.loadingMore = false;
    },
    async fetchSummary(spaceId: string, networkId: NetworkID, limit = 3) {
      const uniqueSpaceId = getUniqueSpaceId(spaceId, networkId);

      if (!this.proposals[uniqueSpaceId]) {
        this.proposals[uniqueSpaceId] = {
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

      const record = toRef(this.proposals, uniqueSpaceId) as Ref<SpaceRecord>;
      if (record.value.summaryLoading || record.value.summaryLoaded) {
        return;
      }

      record.value.summaryLoading = true;
      record.value.summaryProposals = await getNetwork(networkId).api.loadProposalsSummary(
        spaceId,
        limit
      );
      record.value.summaryLoaded = true;
      record.value.summaryLoading = false;
    },
    async fetchProposal(spaceId: string, proposalId: number, networkId: NetworkID) {
      const uniqueSpaceId = getUniqueSpaceId(spaceId, networkId);

      if (!this.proposals[uniqueSpaceId]) {
        this.proposals[uniqueSpaceId] = {
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

      const record = toRef(this.proposals, uniqueSpaceId) as Ref<SpaceRecord>;
      if (this.getProposal(spaceId, proposalId, networkId)) return;

      const proposal = await getNetwork(networkId).api.loadProposal(spaceId, proposalId);

      if (this.getProposal(spaceId, proposalId, networkId)) return;
      record.value.proposals.push(proposal);
    }
  }
});
