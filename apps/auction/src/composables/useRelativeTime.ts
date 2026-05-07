import { MaybeRefOrGetter } from 'vue';
import { _rt } from '@/helpers/utils';

export function useRelativeTime(
  time: MaybeRefOrGetter<number>,
  withoutSuffix = false
) {
  const relativeTime = ref(_rt(toValue(time), withoutSuffix));

  useIntervalFn(() => {
    relativeTime.value = _rt(toValue(time), withoutSuffix);
  }, 1000);

  watch(
    () => toValue(time),
    time => {
      relativeTime.value = _rt(time, withoutSuffix);
    }
  );

  return relativeTime;
}
