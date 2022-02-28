import { reactive, watch } from 'vue';
import { lsGet, lsSet } from '@/helpers/utils';

const proposals = reactive(lsGet('proposals', {}));

export function useEditor() {
  watch(proposals, () => lsSet('proposals', proposals));

  return { proposals };
}
