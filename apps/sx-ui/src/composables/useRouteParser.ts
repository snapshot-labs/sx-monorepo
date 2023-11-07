import { NetworkID } from '@/types';

export function useRouteParser(paramName: string) {
  const route = useRoute();

  const param = computed(() => route.params[paramName] as string);
  const networkId = computed(() => (param.value ? (param.value.split(':')[0] as NetworkID) : null));
  const address = computed(() => (param.value ? param.value.split(':')[1] : null));

  return {
    param,
    networkId,
    address
  };
}
