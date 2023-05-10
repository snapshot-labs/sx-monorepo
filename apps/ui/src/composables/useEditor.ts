import { lsGet, lsSet, omit } from '@/helpers/utils';
import { Draft, Drafts } from '@/types';

const proposals = reactive<Drafts>(lsGet('proposals', {}));

function removeEmpty(proposals: Drafts): Drafts {
  return Object.entries(proposals).reduce((acc, [id, proposal]) => {
    const { execution, ...rest } = omit(proposal, ['updatedAt']);
    const hasFormValues = Object.values(rest).some(val => !!val);

    if (execution.length === 0 && !hasFormValues) {
      return acc;
    }

    if (typeof proposal.proposalId === 'number') {
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
  spaceId: string,
  payload?: Partial<Draft> & { proposalId?: number },
  draftKey?: string
) {
  const id = draftKey || generateId();
  const key = `${spaceId}:${id}`;

  proposals[key] = {
    title: '',
    body: '',
    discussion: '',
    executionStrategy: null,
    execution: [],
    updatedAt: Date.now(),
    proposalId: null,
    ...payload
  };
  return id;
}

export function useEditor() {
  watch(proposals, () => lsSet('proposals', removeEmpty(proposals)));

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

  return {
    proposals,
    drafts,
    generateId,
    createDraft,
    removeDraft
  };
}
