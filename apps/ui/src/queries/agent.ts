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
  AgentAccount,
  fetchAccount,
  isAgentVotingAvailable,
  saveContext
} from '@/helpers/agent';

type AgentInfo = {
  spaces: string[];
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

export function useAgentAccountQuery(alias: MaybeRefOrGetter<Wallet | null>) {
  const { web3Account } = useWeb3();

  const queryFn = computed(() => {
    const wallet = toValue(alias);
    if (!isAgentVotingAvailable || !wallet || !web3Account.value) {
      return skipToken;
    }

    return () => fetchAccount(wallet, web3Account.value);
  });

  return useQuery({
    queryKey: ['agent', 'account', web3Account] as const,
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
      queryClient.setQueryData<AgentAccount>(
        ['agent', 'account', web3Account],
        previous => {
          if (!previous) return previous;

          const rest = previous.contexts.filter(row => row.space !== space);

          return {
            ...previous,
            contexts: context.trim() ? [...rest, { space, context }] : rest
          };
        }
      );
    }
  });
}
