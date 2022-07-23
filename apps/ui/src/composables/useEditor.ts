import { reactive, watch, computed } from 'vue';
import { lsGet, lsSet } from '@/helpers/utils';

const proposals = reactive(lsGet('proposals', {}));

function removeEmpty(proposals) {
  return Object.entries(proposals).reduce(
    (acc, [id, proposal]: [string, any]) => {
      const { execution, ...rest } = proposal;
      const hasFormValues = Object.values(rest).some(val => !!val);

      if (execution.length === 0 && !hasFormValues) {
        return acc;
      }

      return {
        ...acc,
        [id]: proposal
      };
    },
    {}
  );
}

export function useEditor() {
  watch(proposals, () => lsSet('proposals', removeEmpty(proposals)));

  const drafts = computed(() => removeEmpty(proposals));

  function removeDraft(key) {
    delete proposals[key];
  }

  return { proposals, drafts, removeDraft };
}
