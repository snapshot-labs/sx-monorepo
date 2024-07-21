import { BASIC_CHOICES } from '@/helpers/constants';
import { lsGet, lsSet, omit } from '@/helpers/utils';
import { Draft, Drafts, NetworkID } from '@/types';

const proposals = reactive<Drafts>(lsGet('proposals', {}));

function removeEmpty(proposals: Drafts): Drafts {
  return Object.entries(proposals).reduce(async (acc, [id, proposal]) => {
    const [networkId, space] = id.split(':');
    const defaultVotingType = await getSpaceDefaultVoteType(`${networkId}:${space}`);

    const { execution, type, choices, ...rest } = omit(proposal, ['updatedAt']);
    const hasFormValues = Object.values(rest).some(val => !!val);
    const hasChangedVotingType = type !== defaultVotingType;
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

function generateId() {
  return (Math.random() + 1).toString(36).substring(7);
}

async function getSpaceDefaultVoteType(spaceId: string) {
  const spacesStore = useSpacesStore();
  if (!spacesStore.spacesMap.get(spaceId)) {
    const [id, networkId] = spaceId.split(':');
    await spacesStore.fetchSpace(id, networkId as NetworkID);
  }

  const space = spacesStore.spacesMap.get(spaceId);

  if (!space) throw new Error('Invalid space');

  return space.voting_types.includes('single-choice') ? 'single-choice' : space.voting_types[0];
}

async function createDraft(
  spaceId: string,
  payload?: Partial<Draft> & { proposalId?: number | string },
  draftKey?: string
) {
  const type = payload?.type || (await getSpaceDefaultVoteType(spaceId));
  const choices = type === 'basic' ? BASIC_CHOICES : Array(2).fill('');

  const id = draftKey || generateId();
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

  function removeDraft(key: string) {
    delete proposals[key];
  }

  watch(proposals, () => lsSet('proposals', removeEmpty(proposals)));

  return {
    proposals,
    drafts,
    generateId,
    createDraft,
    removeDraft
  };
}
