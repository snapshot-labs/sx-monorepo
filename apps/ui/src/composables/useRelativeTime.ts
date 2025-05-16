import { MaybeRefOrGetter } from 'vue';
import { _rt } from '@/helpers/utils';

export function useRelativeTime(time: MaybeRefOrGetter<number>) {
  const relativeTime = ref(_rt(toValue(time)));

  useIntervalFn(() => {
    relativeTime.value = _rt(toValue(time));
  }, 1000);

  return relativeTime;
}
