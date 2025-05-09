import { MaybeRefOrGetter } from 'vue';

export type SpaceType = 'proposalsSpace' | 'discussionsSpace';

export function useSpaceType(spaceParam: MaybeRefOrGetter<string>) {
  const { isWhiteLabel, space: whitelabelSpace } = useWhiteLabel();

  return computed<SpaceType>(() => {
    if (
      toValue(spaceParam) === 's:openagora.eth' ||
      (isWhiteLabel.value &&
        whitelabelSpace.value?.id === 'openagora.eth' &&
        whitelabelSpace.value?.network === 's')
    ) {
      return 'discussionsSpace';
    }

    return 'proposalsSpace';
  });
}
