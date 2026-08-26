import { Wallet } from '@ethersproject/wallet';
import {
  skipToken,
  useMutation,
  useQuery,
  useQueryClient
} from '@tanstack/vue-query';
import { MaybeRefOrGetter } from 'vue';
import {
  AGENT_URL,
  fetchContexts,
  isAgentVotingAvailable,
  saveContext,
  SpaceContext
} from '@/helpers/agent';

type AgentInfo = {
  spaces: string[];
  signer: string;
};

export function useAgentInfoQuery() {
  return useQuery({
    queryKey: ['agent', 'info'],
    queryFn: async (): Promise<AgentInfo> => {
      const res = await fetch(AGENT_URL);
      if (!res.ok) throw new Error('Failed to load agent info');

      return res.json();
    },
    enabled: isAgentVotingAvailable,
    staleTime: Infinity
  });
}

export function useAgentContextsQuery(alias: MaybeRefOrGetter<Wallet | null>) {
  const { web3Account } = useWeb3();

  const queryFn = computed(() => {
    const wallet = toValue(alias);
    if (!isAgentVotingAvailable || !wallet || !web3Account.value) {
      return skipToken;
    }

    return async (): Promise<SpaceContext[]> =>
      fetchContexts(wallet, web3Account.value);
  });

  return useQuery({
    queryKey: ['agent', 'contexts', web3Account] as const,
    queryFn
  });
}

export function useSaveAgentContextMutation(
  alias: MaybeRefOrGetter<Wallet | null>
) {
  const { web3Account } = useWeb3();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      space,
      context
    }: {
      space: string;
      context: string;
    }) => {
      const wallet = toValue(alias);
      if (!wallet) throw new Error('This browser has no alias key');

      return saveContext(wallet, web3Account.value, space, context);
    },
    onSuccess: (_result, { space, context }) => {
      queryClient.setQueryData<SpaceContext[]>(
        ['agent', 'contexts', web3Account],
        previous => {
          const rest = (previous ?? []).filter(row => row.space !== space);

          return context.trim() ? [...rest, { space, context }] : rest;
        }
      );
    }
  });
}
