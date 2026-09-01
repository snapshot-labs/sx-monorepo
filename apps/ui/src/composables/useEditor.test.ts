// @vitest-environment happy-dom
import { QueryClient, VUE_QUERY_CLIENT } from '@tanstack/vue-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from 'vue';

const DRAFT_ID = 's:test.eth:abc';
const TRANSACTION = { to: '0x0000000000000000000000000000000000000001' };

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, gcTime: Infinity }
  }
});

let testApp: ReturnType<typeof createApp>;

function draft(rest: Record<string, unknown>) {
  return {
    title: '',
    body: '',
    discussion: '',
    type: 'basic',
    choices: [],
    privacy: 'none',
    labels: [],
    updatedAt: 1,
    originalProposal: null,
    ...rest
  };
}

// the draft store is hydrated once, at module load
async function loadStoredDraft(stored: Record<string, unknown>) {
  localStorage.setItem('ui.proposals', JSON.stringify({ [DRAFT_ID]: stored }));
  vi.resetModules();

  const { useEditor } = await import('./useEditor');

  let proposals!: ReturnType<typeof useEditor>['proposals'];
  testApp = createApp({
    setup() {
      proposals = useEditor().proposals;
      return () => null;
    }
  });
  testApp.provide(VUE_QUERY_CLIENT, queryClient);
  testApp.mount(document.createElement('div'));

  return proposals[DRAFT_ID];
}

beforeEach(() => {
  localStorage.clear();
  queryClient.clear();
});

afterEach(() => {
  testApp?.unmount();
});

describe('useEditor', () => {
  describe('stored executions', () => {
    it('should keep executions keyed by chain and address', async () => {
      const stored = await loadStoredDraft(
        draft({ executions: { '1:0xabc': [TRANSACTION] } })
      );

      expect(stored.executions).toEqual({ '1:0xabc': [TRANSACTION] });
    });

    it('should drop executions keyed by address only', async () => {
      const stored = await loadStoredDraft(
        draft({
          executions: { '0xabc': [TRANSACTION], '1:0xabc': [] }
        })
      );

      expect(stored.executions).toEqual({ '1:0xabc': [] });
    });

    it('should drop the legacy single treasury execution', async () => {
      const stored = await loadStoredDraft(
        draft({
          execution: [TRANSACTION],
          executionStrategy: { address: '0xabc', type: 'ReadOnlyExecution' }
        })
      );

      expect(stored.executions).toEqual({});
      expect(stored).not.toHaveProperty('execution');
      expect(stored).not.toHaveProperty('executionStrategy');
    });
  });
});
