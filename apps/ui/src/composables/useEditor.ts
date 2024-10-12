import { BASIC_CHOICES } from '@/helpers/constants';
import { lsGet, lsSet, omit } from '@/helpers/utils';
import { Draft, Drafts, VoteType } from '@/types';

const PREFERRED_VOTE_TYPE = 'basic';

const storedProposals = lsGet('proposals', {});
const processedProposals = Object.fromEntries(
  Object.entries(storedProposals).map(([k, v]) => {
    const processed = v as any;

    // convert single treasury to multiple treasuries format
    if ('execution' in processed && 'executionStrategy' in processed) {
      processed.executions =
        processed.executionStrategy && processed.execution
          ? {
              [processed.executionStrategy.address]: processed.execution
            }
          : {};

      delete processed.execution;
      delete processed.executionStrategy;
    }

    return [k, v];
  })
);

const proposals = reactive<Drafts>(processedProposals as Drafts);
const spaceVoteType = reactive(new Map<string, VoteType>());

function generateId() {
  return (Math.random() + 1).toString(36).substring(7);
}

function getSpaceId(draftId: string) {
  return draftId.split(':').slice(0, 2).join(':');
}

export function useEditor() {
  const drafts = computed(() => {
    return Object.entries(removeEmpty(proposals))
      .map(([k, value]) => {
        const [networkId, space, key] = k.split(':');

        return {
          id: k,
          networkId,
          space,
          key,
          ...value
        };
      })
      .sort((a, b) => b.updatedAt - a.updatedAt);
  });

  function removeEmpty(proposals: Drafts): Drafts {
    return Object.entries(proposals).reduce((acc, [id, proposal]) => {
      const { executions, type, choices, labels, ...rest } = omit(proposal, [
        'updatedAt'
      ]);
      const hasFormValues = Object.values(rest).some(val => !!val);
      const hasChangedVotingType = type !== spaceVoteType.get(getSpaceId(id));
      const hasFormChoices =
        type !== 'basic' && (choices || []).some(val => !!val);

      if (
        Object.keys(executions).length === 0 &&
        labels.length === 0 &&
        !hasFormValues &&
        !hasChangedVotingType &&
        !hasFormChoices
      ) {
        return acc;
      }

      if (proposal.proposalId !== null) {
        return acc;
      }

      return {
        ...acc,
        [id]: proposal
      };
    }, {});
  }

  async function setSpacesVoteType(spaceIds: string[]) {
    const spacesStore = useSpacesStore();
    const newIds = spaceIds.filter(id => !spaceVoteType.has(id));

    if (!newIds.length) return;

    const spacesToFetch = newIds.filter(id => !spacesStore.spacesMap.has(id));
    if (spacesToFetch.length) {
      await spacesStore.fetchSpaces(spacesToFetch);
    }

    for (const id of newIds) {
      const space = spacesStore.spacesMap.get(id);

      if (!space) continue;

      const type = space.voting_types.includes(PREFERRED_VOTE_TYPE)
        ? PREFERRED_VOTE_TYPE
        : space.voting_types[0];

      spaceVoteType.set(id, type);
    }
  }

  async function createDraft(
    spaceId: string,
    payload?: Partial<Draft> & { proposalId?: number | string },
    draftKey?: string
  ) {
    await setSpacesVoteType([spaceId]);

    const type = payload?.type || spaceVoteType.get(spaceId)!;
    const choices = type === 'basic' ? BASIC_CHOICES : Array(2).fill('');

    const id = draftKey ?? generateId();
    const key = `${spaceId}:${id}`;

    proposals[key] = {
      title: '',
      body: '',
      discussion: '',
      type,
      choices,
      labels: [],
      executions: Object.create(null),
      updatedAt: Date.now(),
      proposalId: null,
      ...payload
    };

    return id;
  }

  function removeDraft(key: string) {
    delete proposals[key];
  }

  watch(proposals, async items => {
    const ids = Object.keys(items).map(getSpaceId);

    await setSpacesVoteType(ids);

    lsSet('proposals', removeEmpty(proposals));
  });

  return {
    proposals,
    drafts,
    generateId,
    createDraft,
    removeDraft
  };
}
