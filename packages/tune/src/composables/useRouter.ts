import { inject } from 'vue';
import { useRouter as useVueRouter } from 'vue-router';
import { TUNE_OPTIONS_KEY } from '../plugin';

export function useRouter() {
  const options = inject(TUNE_OPTIONS_KEY, {});

  return options.useRouter?.() ?? useVueRouter();
}
