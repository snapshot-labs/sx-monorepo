import { createAgent, registerTools } from '@ui-sdk/vue/agent';

export function registerAgentTools() {
  // registerTools checks too, but a bridge makes every component report to it
  if (!('modelContext' in document)) return;

  // No confirmation UI yet, so a step on a data-agent-confirm control is
  // refused and the person does it
  registerTools(createAgent(), { allow: step => !step.confirm });
}
