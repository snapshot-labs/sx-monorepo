import { createAgent, registerTools } from '@ui-sdk/vue/agent';

/**
 * Lets the browser's own agent (WebMCP) read and use the app's UI SDK
 * components, only in browsers that support it. Controls marked with
 * `data-agent-confirm` wait for the person, and `data-agent-hidden` stays out
 * of the agent's view.
 */
export function registerAgentTools() {
  if (!('modelContext' in document)) return;

  registerTools(createAgent(), { allow: step => !step.confirm });
}
