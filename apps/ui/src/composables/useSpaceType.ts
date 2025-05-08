import { MaybeRefOrGetter } from 'vue';

export type SpaceType = 'proposalsSpace' | 'discussionsSpace';

export function useSpaceType(spaceParam: MaybeRefOrGetter<string>) {
  const { isWhiteLabel, space: whitelabelSpace } = useWhiteLabel();

  return computed<SpaceType>(() => {
    if (
      toValue(spaceParam) === 's:ethpoll.eth' ||
      (isWhiteLabel.value &&
        whitelabelSpace.value?.id === 'ethpoll.eth' &&
        whitelabelSpace.value?.network === 's')
    ) {
      return 'discussionsSpace';
    }

    return 'proposalsSpace';
  });
}
