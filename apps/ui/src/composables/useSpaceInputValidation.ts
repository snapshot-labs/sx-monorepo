import { getNetwork } from '@/networks';
import { NetworkID } from '@/types';

type SpaceValidationResult = { value: string; valid: boolean };

export function useSpaceInputValidation(
  networkId: Ref<NetworkID>,
  value: Ref<string>
) {
  const loading = ref(false);
  const validationResult = ref(null as SpaceValidationResult | null);

  const network = computed(() => getNetwork(networkId.value));
  const error = computed(() => {
    if (validationResult.value === null) return null;
    if (validationResult.value.value !== value.value) return null;
    if (validationResult.value.valid) return null;

    return `Space ${validationResult.value.value} not found`;
  });

  watchDebounced(
    value,
    async value => {
      loading.value = true;

      try {
        if (!value || value === validationResult.value?.value) {
          validationResult.value = {
            value,
            valid: true
          };
          return;
        }

        const space = await network.value.api.loadSpace(value);
        validationResult.value = {
          value,
          valid: !!space
        };
      } catch (e) {
        console.error(e);

        validationResult.value = {
          value,
          valid: false
        };
      } finally {
        loading.value = false;
      }
    },
    { debounce: 500, immediate: true }
  );

  return {
    loading,
    validationResult,
    error
  };
}
