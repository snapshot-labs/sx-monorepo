import knex from 'knex';
import config from '../knexfile';

const db = knex(config);

export type Agent = {
  id: number;
  name: string;
  user_address: string;
  agent_address: string;
  agent_name: string;
  soul_md: string;
  vote_count: number;
  active: boolean;
  created_at: string;
};

export type AgentContext = {
  id: number;
  agent_id: number;
  space_id: string;
  context: string;
};

export type AgentWithContexts = Agent & { contexts: AgentContext[] };

export async function createAgent(
  userAddress: string,
  agentAddress: string,
  agentName: string,
  name: string,
  soulMd: string
) {
  const [agent] = await db('agents')
    .insert({
      name,
      user_address: userAddress.toLowerCase(),
      agent_address: agentAddress.toLowerCase(),
      agent_name: agentName,
      soul_md: soulMd
    })
    .returning('*');
  return agent as Agent;
}

export async function setAgentContexts(
  agentId: number,
  contexts: { spaceId: string; context: string }[]
) {
  await db('agent_contexts').where({ agent_id: agentId }).delete();
  if (!contexts.length) return;
  await db('agent_contexts').insert(
    contexts.map(c => ({
      agent_id: agentId,
      space_id: c.spaceId,
      context: c.context
    }))
  );
}

export function confirmAgent(agentAddress: string) {
  return db('agents')
    .where({ agent_address: agentAddress.toLowerCase() })
    .update({ active: true });
}

export async function updateAgent(
  agentAddress: string,
  name: string,
  soulMd: string,
  contexts: { spaceId: string; context: string }[]
) {
  const agent = await db<Agent>('agents')
    .where({ agent_address: agentAddress.toLowerCase() })
    .first();
  if (!agent) throw new Error('Agent not found');
  await db('agents').where({ id: agent.id }).update({ name, soul_md: soulMd });
  await setAgentContexts(agent.id, contexts);
  return agent;
}

export function incrementVoteCount(agentId: number) {
  return db('agents').where({ id: agentId }).increment('vote_count', 1);
}

export async function deleteAgent(agentAddress: string) {
  return db('agents')
    .where({ agent_address: agentAddress.toLowerCase() })
    .delete();
}

export async function getAgentByAddress(
  agentAddress: string
): Promise<AgentWithContexts | null> {
  const agent = await db<Agent>('agents')
    .where({ agent_address: agentAddress.toLowerCase() })
    .first();
  if (!agent) return null;
  const contexts = await db<AgentContext>('agent_contexts').where({
    agent_id: agent.id
  });
  return { ...agent, contexts };
}

export async function getAgentsByUser(
  userAddress: string
): Promise<AgentWithContexts[]> {
  const agents = await db<Agent>('agents')
    .where({ user_address: userAddress.toLowerCase() })
    .orderBy('created_at', 'desc');
  if (!agents.length) return [];
  const contexts = await db<AgentContext>('agent_contexts').whereIn(
    'agent_id',
    agents.map(a => a.id)
  );
  return agents.map(agent => ({
    ...agent,
    contexts: contexts.filter(c => c.agent_id === agent.id)
  }));
}

export async function getActiveAgents(): Promise<AgentWithContexts[]> {
  const agents = await db<Agent>('agents').where({ active: true });
  if (!agents.length) return [];
  const contexts = await db<AgentContext>('agent_contexts').whereIn(
    'agent_id',
    agents.map(a => a.id)
  );
  return agents.map(agent => ({
    ...agent,
    contexts: contexts.filter(c => c.agent_id === agent.id)
  }));
}
