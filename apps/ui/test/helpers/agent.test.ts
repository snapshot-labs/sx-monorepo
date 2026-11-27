// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerAgentTools } from '@/helpers/agent';

const { agent, createAgent, registerTools } = vi.hoisted(() => {
  const agent = { name: 'agent' };
  return { agent, createAgent: vi.fn(() => agent), registerTools: vi.fn() };
});
vi.mock('@ui-sdk/vue/agent', () => ({ createAgent, registerTools }));

describe('registerAgentTools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Reflect.deleteProperty(document, 'modelContext');
  });

  it('does nothing in a browser without WebMCP', () => {
    registerAgentTools();

    expect(createAgent).not.toHaveBeenCalled();
    expect(registerTools).not.toHaveBeenCalled();
  });

  it('registers the tools and leaves marked steps to the person', () => {
    Object.assign(document, { modelContext: { registerTool: vi.fn() } });

    registerAgentTools();

    expect(registerTools).toHaveBeenCalledWith(agent, {
      allow: expect.any(Function)
    });
    const { allow } = registerTools.mock.calls[0][1];
    expect(allow({ action: 'press', args: [] })).toBe(true);
    expect(
      allow({ action: 'press', args: [], confirm: 'Deletes this space' })
    ).toBe(false);
  });
});
