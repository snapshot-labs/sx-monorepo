import { useQuery } from '@tanstack/vue-query';
import { MaybeRefOrGetter, toValue } from 'vue';

const AGENT_URL = import.meta.env.VITE_AGENT_URL || 'http://localhost:3002';

export type AgentContext = {
  id: number;
  agent_id: number;
  space_id: string;
  context: string;
};

export type Agent = {
  id: number;
  name: string;
  user_address: string;
  agent_address: string;
  agent_name: string;
  soul_md: string;
  vote_count: number;
  active: boolean;
  contexts: AgentContext[];
};

export function useAgentsByUserQuery(
  userAddress: MaybeRefOrGetter<string>
) {
  return useQuery<Agent[]>({
    queryKey: ['agents', userAddress],
    queryFn: async () => {
      const res = await fetch(
        `${AGENT_URL}/agents/${toValue(userAddress)}`
      );
      return res.json();
    },
    enabled: () => !!toValue(userAddress)
  });
}

export function useAgentDetailQuery(
  agentAddress: MaybeRefOrGetter<string>
) {
  return useQuery<Agent | null>({
    queryKey: ['agent', agentAddress],
    queryFn: async () => {
      const res = await fetch(
        `${AGENT_URL}/agent/${toValue(agentAddress)}`
      );
      return res.json();
    },
    enabled: () => !!toValue(agentAddress)
  });
}
