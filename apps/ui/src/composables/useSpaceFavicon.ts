import { Ref } from 'vue';
import { getCacheHash, getStampUrl } from '@/helpers/utils';
import { Space } from '@/types';

export function useSpaceFavicon(
  space: Ref<Space | null>,
  resetOnUnmount = true
) {
  const { setFavicon } = useFavicon();

  watchEffect(() => {
    if (!space.value) {
      setFavicon(null);
      return;
    }

    setFavicon(
      getStampUrl(
        'space',
        `${space.value.network}:${space.value.id}`,
        16,
        getCacheHash(space.value.avatar)
      )
    );
  });

  onUnmounted(() => {
    if (resetOnUnmount) setFavicon(null);
  });
}
