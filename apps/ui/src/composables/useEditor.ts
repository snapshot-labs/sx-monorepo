import { BASIC_CHOICES } from '@/helpers/constants';
import { lsGet, lsSet, omit } from '@/helpers/utils';
import { getNetwork } from '@/networks';
import { Draft, Drafts, NetworkID } from '@/types';

const proposals = reactive<Drafts>(lsGet('proposals', {}));

function getDefaultVotingType(networkId: NetworkID) {
  const network = getNetwork(networkId);

  return network.helpers.isVotingTypeSupported('single-choice')
    ? 'single-choice'
    : 'basic';
}

function removeEmpty(proposals: Drafts): Drafts {
  return Object.entries(proposals).reduce((acc, [id, proposal]) => {
    const networkId = id.split(':')[0] as NetworkID;
    const defaultVotingType = getDefaultVotingType(networkId);

    const { execution, type, choices, ...rest } = omit(proposal, ['updatedAt']);
    const hasFormValues = Object.values(rest).some(val => !!val);
    const hasChangedVotingType = type !== defaultVotingType;
    const hasFormChoices =
      type !== 'basic' && (choices || []).some(val => !!val);

    if (
      execution.length === 0 &&
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

function generateId() {
  return (Math.random() + 1).toString(36).substring(7);
}

function createDraft(
  networkId: NetworkID,
  spaceId: string,
  payload?: Partial<Draft> & { proposalId?: number | string },
  draftKey?: string
) {
  const type = getDefaultVotingType(networkId);
  const choices = type === 'single-choice' ? Array(2).fill('') : BASIC_CHOICES;

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
