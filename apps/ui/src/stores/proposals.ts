import { defineStore } from 'pinia';
import { getNames } from '@/helpers/stamp';
import { getNetwork } from '@/networks';
import { ProposalsFilter } from '@/networks/types';
import { NetworkID, Proposal } from '@/types';

type SpaceRecord = {
  loading: boolean;
  loadingMore: boolean;
  loaded: boolean;
  proposalsIdsList: (string | number)[];
  proposals: Record<number, Proposal>;
  hasMoreProposals: boolean;
  summaryLoading: boolean;
  summaryLoaded: boolean;
  summaryProposals: Proposal[];
};

const PROPOSALS_LIMIT = 20;

// TODO: create special _id that is used for UI that is prefixed by networkId
const getUniqueSpaceId = (spaceId: string, networkId: NetworkID) =>
  `${networkId}:${spaceId}`;

export const useProposalsStore = defineStore('proposals', () => {
  const metaStore = useMetaStore();
  const proposals = ref({} as Partial<Record<string, SpaceRecord>>);

  async function withAuthorNames(proposals: Proposal[]) {
    const names = await getNames(proposals.map(proposal => proposal.author.id));

    return proposals.map(proposal => {
      proposal.author.name = names[proposal.author.id];

      return proposal;
    });
  }

  const getSpaceProposals = (spaceId: string, networkId: NetworkID) => {
    const record = proposals.value[getUniqueSpaceId(spaceId, networkId)];
    if (!record) return [];

    return record.proposalsIdsList.map(
      proposalId => record.proposals[proposalId]
    );
  };

  const getProposal = (
    spaceId: string,
    proposalId: number | string,
    networkId: NetworkID
  ): Proposal | undefined => {
    const record = proposals.value[getUniqueSpaceId(spaceId, networkId)];
    if (!record) return undefined;

    return record.proposals[proposalId];
  };

  function reset(spaceId: string, networkId: NetworkID) {
    const uniqueSpaceId = getUniqueSpaceId(spaceId, networkId);
    delete proposals.value[uniqueSpaceId];
  }

  async function fetch(
    spaceId: string,
    networkId: NetworkID,
    state?: ProposalsFilter['state']
  ) {
    await metaStore.fetchBlock(networkId);

    const uniqueSpaceId = getUniqueSpaceId(spaceId, networkId);

    if (!proposals.value[uniqueSpaceId]) {
      proposals.value[uniqueSpaceId] = {
        loading: false,
        loadingMore: false,
        loaded: false,
        proposalsIdsList: [],
        proposals: {},
        hasMoreProposals: true,
        summaryLoading: false,
        summaryLoaded: false,
        summaryProposals: []
      };
    }

    const record = toRef(proposals.value, uniqueSpaceId) as Ref<SpaceRecord>;
    if (record.value.loading || record.value.loaded) return;

    record.value.loading = true;

    const fetchedProposals = await withAuthorNames(
      await getNetwork(networkId).api.loadProposals(
        [spaceId],
        {
          limit: PROPOSALS_LIMIT
        },
        metaStore.getCurrent(networkId) || 0,
        { state }
      )
    );

    record.value.proposalsIdsList = fetchedProposals.map(
      proposal => proposal.proposal_id
    );
    record.value.proposals = {
      ...record.value.proposals,
      ...Object.fromEntries(
        fetchedProposals.map(proposal => [proposal.proposal_id, proposal])
      )
    };
    record.value.hasMoreProposals = fetchedProposals.length === PROPOSALS_LIMIT;
    record.value.loaded = true;
    record.value.loading = false;
  }

  async function fetchMore(spaceId: string, networkId: NetworkID) {
    await metaStore.fetchBlock(networkId);

    const uniqueSpaceId = getUniqueSpaceId(spaceId, networkId);

    if (!proposals.value[uniqueSpaceId]) {
      proposals.value[uniqueSpaceId] = {
        loading: false,
        loadingMore: false,
        loaded: false,
        proposalsIdsList: [],
        proposals: {},
        hasMoreProposals: true,
        summaryLoading: false,
        summaryLoaded: false,
        summaryProposals: []
      };
    }

    const record = toRef(proposals.value, uniqueSpaceId) as Ref<SpaceRecord>;
    if (record.value.loading || !record.value.loaded) return;

    record.value.loadingMore = true;

    const fetchedProposals = await withAuthorNames(
      await getNetwork(networkId).api.loadProposals(
        [spaceId],
        {
          limit: PROPOSALS_LIMIT,
          skip: record.value.proposalsIdsList.length
        },
        metaStore.getCurrent(networkId) || 0
      )
    );

    record.value.proposalsIdsList = [
      ...record.value.proposalsIdsList,
      ...fetchedProposals.map(proposal => proposal.proposal_id)
    ];
    record.value.proposals = {
      ...record.value.proposals,
      ...Object.fromEntries(
        fetchedProposals.map(proposal => [proposal.proposal_id, proposal])
      )
    };

    record.value.hasMoreProposals = fetchedProposals.length === PROPOSALS_LIMIT;
    record.value.loadingMore = false;
  }

  async function fetchSummary(
    spaceId: string,
    networkId: NetworkID,
    limit = 3
  ) {
    await metaStore.fetchBlock(networkId);

    const uniqueSpaceId = getUniqueSpaceId(spaceId, networkId);

    if (!proposals.value[uniqueSpaceId]) {
      proposals.value[uniqueSpaceId] = {
        loading: false,
        loadingMore: false,
        loaded: false,
        proposalsIdsList: [],
        proposals: {},
        hasMoreProposals: true,
        summaryLoading: false,
        summaryLoaded: false,
        summaryProposals: []
      };
    }

    const record = toRef(proposals.value, uniqueSpaceId) as Ref<SpaceRecord>;
    if (record.value.summaryLoading || record.value.summaryLoaded) {
      return;
    }

    record.value.summaryLoading = true;
    record.value.summaryProposals = await withAuthorNames(
      await getNetwork(networkId).api.loadProposals(
        [spaceId],
        { limit },
        metaStore.getCurrent(networkId) || 0
      )
    );
    record.value.summaryLoaded = true;
    record.value.summaryLoading = false;
  }

  async function fetchProposal(
    spaceId: string,
    proposalId: number | string,
    networkId: NetworkID
  ) {
    await metaStore.fetchBlock(networkId);

    const uniqueSpaceId = getUniqueSpaceId(spaceId, networkId);

    if (!proposals.value[uniqueSpaceId]) {
      proposals.value[uniqueSpaceId] = {
        loading: false,
        loadingMore: false,
        loaded: false,
        proposalsIdsList: [],
        proposals: {},
        hasMoreProposals: true,
        summaryLoading: false,
        summaryLoaded: false,
        summaryProposals: []
      };
    }

    const record = toRef(proposals.value, uniqueSpaceId) as Ref<SpaceRecord>;

    const proposal = await getNetwork(networkId).api.loadProposal(
      spaceId,
      proposalId,
      metaStore.getCurrent(networkId) || 0
    );
    if (!proposal) return;

    record.value.proposals = {
      ...record.value.proposals,
      [proposalId]: (await withAuthorNames([proposal]))[0]
    };
  }

  return {
    proposals,
    reset,
    fetch,
    fetchMore,
    fetchSummary,
    fetchProposal,
    getSpaceProposals,
    getProposal
  };
});
