import { createAgent, registerTools } from '@ui-sdk/vue/agent';

export function registerAgentTools() {
  // registerTools checks too, but a bridge makes every component report to it
  if (!('modelContext' in document)) return;

  // Steps on data-agent-confirm controls are refused: the person does those
  registerTools(createAgent(), { allow: step => !step.confirm });
}
