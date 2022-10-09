import { Ref, toRef } from 'vue';
import { defineStore } from 'pinia';
import apollo from '@/helpers/apollo';
import {
  PROPOSALS_QUERY,
  PROPOSALS_SUMMARY_QUERY,
  PROPOSAL_QUERY
} from '@/helpers/queries';
import type { Proposal } from '@/types';

function formatProposal(
  proposal: Omit<Proposal, 'has_ended'>,
  now: number = Date.now()
): Proposal {
  return {
    ...proposal,
    has_ended: proposal.max_end * 1000 <= now
  };
}

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

      const { data } = await apollo.query({
        query: PROPOSALS_QUERY,
        variables: {
          first: 5,
          space: spaceId
        }
      });

      record.value.proposals = data.proposals.map(proposal =>
        formatProposal(proposal)
      );
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

      const now = Date.now();

      const { data } = await apollo.query({
        query: PROPOSALS_SUMMARY_QUERY,
        variables: {
          first: limit,
          space: spaceId,
          threshold: Math.floor(now / 1000)
        }
      });

      record.value.proposals = [
        ...record.value.proposals,
        ...data.active.filter(
          proposal => !this.getProposal(spaceId, proposal.proposal_id)
        ),
        ...data.expired.filter(
          proposal => !this.getProposal(spaceId, proposal.proposal_id)
        )
      ].map(proposal => formatProposal(proposal, now));

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

      const { data } = await apollo.query({
        query: PROPOSAL_QUERY,
        variables: { id: `${spaceId}/${proposalId}` }
      });

      if (this.getProposal(spaceId, proposalId)) return;
      record.value.proposals.push(formatProposal(data.proposal));
    }
  }
});
