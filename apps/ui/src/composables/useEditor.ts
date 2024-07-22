import { BASIC_CHOICES } from '@/helpers/constants';
import { lsGet, lsSet, omit } from '@/helpers/utils';
import { Draft, Drafts, VoteType } from '@/types';

const PREFERRED_VOTE_TYPE = 'single-choice';

const proposals = reactive<Drafts>(lsGet('proposals', {}));
const spaceVoteTypeMapping = reactive(new Map<string, VoteType>());

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
      const { execution, type, choices, ...rest } = omit(proposal, ['updatedAt']);
      const hasFormValues = Object.values(rest).some(val => !!val);
      const hasChangedVotingType = type !== spaceVoteTypeMapping.get(getSpaceId(id));
      const hasFormChoices = type !== 'basic' && (choices || []).some(val => !!val);

      if (execution.length === 0 && !hasFormValues && !hasChangedVotingType && !hasFormChoices) {
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

  async function setSpaceDefaultVoteType(spaceIds: string[]) {
    const spacesStore = useSpacesStore();
    const newIds = spaceIds.filter(id => !spaceVoteTypeMapping.has(id));
    await spacesStore.fetchSpaces(newIds);

    for (const spaceId of newIds) {
      const space = spacesStore.spacesMap.get(spaceId);

      if (!space) continue;

      const type = space.voting_types.includes(PREFERRED_VOTE_TYPE)
        ? PREFERRED_VOTE_TYPE
        : space.voting_types[0];

      spaceVoteTypeMapping.set(spaceId, type);
    }
  }

  async function createDraft(
    spaceId: string,
    payload?: Partial<Draft> & { proposalId?: number | string },
    draftKey?: string
  ) {
    await setSpaceDefaultVoteType([spaceId]);

    const type = payload?.type || spaceVoteTypeMapping.get(spaceId)!;
    const choices = type === 'basic' ? BASIC_CHOICES : Array(2).fill('');

    const id = draftKey ?? generateId();
    const key = `${spaceId}:${id}`;

    proposals[key] = {
      title: '',
      body: '',
      discussion: '',
      type,
      choices,
      executionStrategy: null,
      execution: [],
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

    await setSpaceDefaultVoteType(ids);

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
