import { reactive, watch, computed } from 'vue';
import { lsGet, lsSet, omit } from '@/helpers/utils';
import type { Proposals } from '@/types';

const proposals = reactive<Proposals>(lsGet('proposals', {}));

function removeEmpty(proposals: Proposals): Proposals {
  return Object.entries(proposals).reduce((acc, [id, proposal]) => {
    const { execution, ...rest } = omit(proposal, ['updatedAt']);
    const hasFormValues = Object.values(rest).some(val => !!val);

    if (execution.length === 0 && !hasFormValues) {
      return acc;
    }

    return {
      ...acc,
      [id]: proposal
    };
  }, {});
}

export function useEditor() {
  watch(proposals, () => lsSet('proposals', removeEmpty(proposals)));

  const drafts = computed(() => {
    return Object.entries(removeEmpty(proposals))
      .map(([k, value]) => ({
        id: k,
        key: k.split(':')[1],
        ...value
      }))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  });

  function removeDraft(key: string) {
    delete proposals[key];
  }

  return { proposals, drafts, removeDraft };
}
