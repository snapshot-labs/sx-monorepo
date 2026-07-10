import { LocationQueryRaw } from 'vue-router';
import { ProposalsFilter } from '@/networks/types';
import { Space } from '@/types';

export const ANY_SPACE = 'any';

/**
 * State, labels, and space filters for a proposals list, synced with the
 * URL query. Pass `groupSpaces` (>1) to enable the space filter, where
 * `ANY_SPACE` selects all of them (merged list).
 */
export function useProposalsFilters(
  space: MaybeRefOrGetter<Space>,
  groupSpaces: MaybeRefOrGetter<Space[]> = []
) {
  const router = useRouter();
  const route = useRoute();

  const state = ref<NonNullable<ProposalsFilter['state']>>('any');
  const labels = ref<string[]>([]);
  const selectedSpaceId = ref<string>(ANY_SPACE);

  const hasSpaceFilter = computed(() => toValue(groupSpaces).length > 1);

  /** The space all space-specific context (voting power, labels, heading) is
   *  bound to. `null` when showing the merged list. */
  const selectedSpace = computed<Space | null>(() => {
    if (!hasSpaceFilter.value) return toValue(space);

    return (
      toValue(groupSpaces).find(s => s.id === selectedSpaceId.value) ?? null
    );
  });

  const spaceLabels = computed(() => {
    const labelsList = selectedSpace.value?.labels;
    if (!labelsList) return {};

    return Object.fromEntries(labelsList.map(label => [label.id, label]));
  });

  watchThrottled(
    [
      () => route.query.state as string,
      () => route.query.labels as string[] | string,
      () => route.query.space as string | undefined,
      () => toValue(groupSpaces)
    ],
    ([toState, toLabels, toSpace]) => {
      state.value = ['any', 'active', 'pending', 'closed'].includes(toState)
        ? (toState as NonNullable<ProposalsFilter['state']>)
        : 'any';
      let normalizedLabels = toLabels || [];
      normalizedLabels = Array.isArray(normalizedLabels)
        ? normalizedLabels
        : [normalizedLabels];
      labels.value = normalizedLabels.filter(id => spaceLabels.value[id]);

      const isValidSpace =
        toSpace && toValue(groupSpaces).some(s => s.id === toSpace);
      selectedSpaceId.value = isValidSpace ? toSpace : ANY_SPACE;
    },
    { throttle: 1000, immediate: true }
  );

  watch(
    [() => toValue(space).id, state, labels, selectedSpaceId],
    (
      [toSpaceId, toState, toLabels, toSpace],
      [fromSpaceId, fromState, fromLabels, fromSpace]
    ) => {
      if (
        toSpaceId !== fromSpaceId ||
        toState !== fromState ||
        toLabels !== fromLabels ||
        toSpace !== fromSpace
      ) {
        const query: LocationQueryRaw = { ...route.query };

        if (toState === 'any') {
          delete query.state;
        } else {
          query.state = toState;
        }

        if (toLabels.length) {
          query.labels = toLabels;
        } else {
          delete query.labels;
        }

        if (toSpace !== ANY_SPACE) {
          query.space = toSpace;
        } else {
          delete query.space;
        }

        if (JSON.stringify(query) !== JSON.stringify(route.query)) {
          // NOTE: If we push the same query it will cause scroll position to be reset
          router.push({ query });
        }
      }
    },
    { immediate: true }
  );

  return {
    state,
    labels,
    selectedSpaceId,
    selectedSpace,
    hasSpaceFilter,
    spaceLabels
  };
}
