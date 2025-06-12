import { MaybeRefOrGetter } from 'vue';

export type SpaceType = 'proposalsSpace' | 'discussionsSpace';

export function useTownhallSpace(spaceParam: MaybeRefOrGetter<string>) {
  const { isWhiteLabel, space: whitelabelSpace } = useWhiteLabel();

  const isOpenAgora = computed(() => {
    return (
      toValue(spaceParam) === 's:openagora.eth' ||
      (isWhiteLabel.value &&
        whitelabelSpace.value?.id === 'openagora.eth' &&
        whitelabelSpace.value?.network === 's')
    );
  });

  const townhallSpaceId = computed(() => {
    if (isOpenAgora.value) {
      return 1;
    }

    return null;
  });

  const spaceType = computed<SpaceType>(() => {
    if (isOpenAgora.value) {
      return 'discussionsSpace';
    }

    return 'proposalsSpace';
  });

  return { spaceType, townhallSpaceId };
}
