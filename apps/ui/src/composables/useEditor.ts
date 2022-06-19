import { reactive, watch } from 'vue';
import { lsGet, lsSet } from '@/helpers/utils';

const proposals = reactive(lsGet('proposals', {}));

export function useEditor() {
  watch(proposals, () => lsSet('proposals', proposals));

  function removeDraft(key) {
    delete proposals[key];
  }

  return { proposals, removeDraft };
}
