// @vitest-environment happy-dom
import { flushPromises, shallowMount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { computed, reactive, ref } from 'vue';
import EditorExecution from '@/components/EditorExecution.vue';
import { StrategyWithTreasury } from '@/composables/useTreasuries';
import { createRawTransaction } from '@/helpers/transactions';
import { getExecutionKey } from '@/helpers/ui';
import { Draft, Drafts, Space, Transaction } from '@/types';
import Editor from './Editor.vue';

const route = reactive({ params: { key: 'a' }, query: {} });
const proposals = reactive<Drafts>({});
const strategies = ref<StrategyWithTreasury[]>([]);
const addNotification = vi.fn();
const { getABI } = vi.hoisted(() => ({ getABI: vi.fn() }));

vi.mock('@/helpers/etherscan', () => ({ getABI }));

vi.mock('vue-router', async original => ({
  ...(await original<Record<string, unknown>>()),
  useRoute: () => route,
  useRouter: () => ({ replace: vi.fn() })
}));
vi.mock('@tanstack/vue-query', async original => ({
  ...(await original<Record<string, unknown>>()),
  useQueryClient: () => ({})
}));
vi.mock('@/stores/ui', () => ({ useUiStore: () => ({ addNotification }) }));
vi.mock('@/stores/terms', () => ({ useTermsStore: () => ({}) }));
vi.mock('@/composables/useEditor', () => ({
  useEditor: () => ({ proposals, createDraft: vi.fn(), refreshDrafts: vi.fn() })
}));
vi.mock('@/composables/useTitle', () => ({
  useTitle: () => ({ setTitle: vi.fn() })
}));
vi.mock('@/composables/useActions', () => ({ useActions: () => ({}) }));
vi.mock('@/composables/useWeb3', () => ({
  useWeb3: () => ({ web3: ref({}) })
}));
vi.mock('@/composables/useWalletConnectTransaction', () => ({
  useWalletConnectTransaction: () => ({ transaction: ref(null) })
}));
vi.mock('@/composables/useTreasuries', () => ({
  useTreasuries: () => ({
    strategiesWithTreasuries: strategies,
    isResolvingTreasuries: ref(false),
    isSafeSnapResolving: ref(false)
  })
}));
vi.mock('@/composables/useSettings', () => ({
  useSettings: () => ({
    limits: ref({}),
    lists: ref({ 'space.ecosystem.list': [] })
  })
}));
vi.mock('@/composables/useWhiteLabel', () => ({
  useWhiteLabel: () => ({ isWhiteLabel: ref(false) })
}));
vi.mock('@/composables/useSpaceAlerts', () => ({
  useSpaceAlerts: () => ({ alerts: ref(new Map()) })
}));
vi.mock('@/composables/useSpaceSettings', () => ({
  useSpaceSettings: () => ({})
}));
vi.mock('@/composables/useSafeWallet', () => ({
  useSafeWallet: () => ({ isInvalidNetwork: ref(false) })
}));
vi.mock('@/composables/useModal', () => ({
  useModal: () => ({ modalAccountOpen: ref(false) })
}));
vi.mock('@/queries/propositionPower', () => ({
  usePropositionPowerQuery: () => ({ data: ref(null) })
}));
vi.mock(import('@/helpers/validation'), async original => ({
  ...(await original()),
  validateForm: () => ({})
}));
vi.mock('@/composables/useTreasury', () => ({
  useTreasury: (data: StrategyWithTreasury['treasury']) => ({
    treasury: computed(() => ({
      network: data.chainId,
      wallet: data.address,
      name: data.name,
      supportsTokens: false,
      supportsNfts: false
    }))
  })
}));

const to = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const imported = createRawTransaction({ to, value: '11', data: '0x' });
const content = JSON.stringify({
  chainId: '1',
  transactions: [{ to, value: '11', data: '0x' }]
});
const space = {
  network: 'eth',
  id: 'test',
  name: 'Test',
  protocol: 'snapshot-x',
  treasuries: [],
  voting_types: ['basic'],
  voting_delay: 0
} as unknown as Space;
const key = (index: number) =>
  getExecutionKey(
    strategies.value[index].treasury.chainId,
    strategies.value[index].address
  );
const draft = (name = 'a', network = 'eth') =>
  proposals[`${network}:test:${name}`];

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(complete => {
    resolve = complete;
  });
  return { promise, resolve };
}

const wrappers: ReturnType<typeof shallowMount>[] = [];
async function mountEditor(network = 'eth') {
  const wrapper = shallowMount(Editor, {
    props: { space: { ...space, network } as Space },
    global: {
      renderStubDefaultSlot: true,
      stubs: { EditorExecution: false, teleport: true },
      directives: { tippy: () => {} }
    }
  });
  wrappers.push(wrapper);
  await flushPromises();
  return wrapper;
}

async function startImport(
  editor: ReturnType<typeof shallowMount>,
  text: Promise<string>
) {
  const input = editor.find('input[type=file]');
  Object.defineProperty(input.element, 'files', {
    configurable: true,
    value: [{ text: () => text }]
  });
  await input.trigger('change');
}

beforeEach(() => {
  route.params.key = 'a';
  addNotification.mockReset();
  getABI.mockReset().mockResolvedValue([]);
  for (const name of Object.keys(proposals)) delete proposals[name];
  for (const network of ['eth', 's']) {
    for (const name of ['a', 'b']) {
      proposals[`${network}:test:${name}`] = {
        title: '',
        body: '',
        discussion: '',
        choices: [],
        type: 'basic',
        labels: [],
        executions: {},
        updatedAt: 0
      } as unknown as Draft;
    }
  }
  strategies.value = [1, 2].map(index => ({
    address: `0x${String(index).padStart(40, '0')}`,
    destinationAddress: '0x0',
    type: 'SimpleQuorumAvatar',
    treasury: { chainId: '1', address: to, name: `Treasury ${index}` }
  }));
});
afterEach(() => wrappers.splice(0).forEach(wrapper => wrapper.unmount()));

describe('Safe import editor context', () => {
  it('appends an ordinary import to the current execution', async () => {
    const wrapper = await mountEditor();
    const pending = deferred<string>();
    await startImport(
      wrapper.findAllComponents(EditorExecution)[0],
      pending.promise
    );
    draft().executions[key(0)] = [imported];
    await flushPromises();
    pending.resolve(content);
    await flushPromises();

    expect(draft().executions[key(0)]).toHaveLength(2);
    expect(addNotification).toHaveBeenCalledWith(
      'success',
      'Imported 1 transaction'
    );
  });

  it('rejects two competing callbacks before disabled props can update', async () => {
    const wrapper = await mountEditor();
    const editors = wrapper.findAllComponents(EditorExecution);
    const callbacks = editors.map(editor => editor.props('importTransactions'));

    expect(callbacks[0]([imported])).toBe(true);
    expect(editors[1].props('disabled')).toBe(false);
    expect(callbacks[1]([imported])).toBe(false);
    expect(Object.keys(draft().executions)).toEqual([key(0)]);
  });

  it('accepts only one of two files that finish reading together', async () => {
    const wrapper = await mountEditor();
    const editors = wrapper.findAllComponents(EditorExecution);
    const pending = deferred<string>();
    await startImport(editors[0], pending.promise);
    await startImport(editors[1], pending.promise);
    pending.resolve(content);
    await flushPromises();

    expect(Object.values(draft().executions).map(txs => txs?.length)).toEqual([
      1
    ]);
    expect(addNotification).toHaveBeenCalledExactlyOnceWith(
      'success',
      'Imported 1 transaction'
    );
  });

  it('discards an import whose ABI lookup finishes after another treasury is populated', async () => {
    const wrapper = await mountEditor();
    const editors = wrapper.findAllComponents(EditorExecution);
    const pending = deferred<string[]>();
    getABI.mockReturnValueOnce(pending.promise);
    await startImport(
      editors[0],
      Promise.resolve(
        JSON.stringify({
          chainId: '1',
          transactions: [{ to, value: '0', data: '0x12345678' }]
        })
      )
    );
    await flushPromises();
    expect(getABI).toHaveBeenCalledWith(1, to);
    editors[1].vm.$emit('update:modelValue', [imported]);
    await flushPromises();
    pending.resolve([]);
    await flushPromises();

    expect(draft().executions[key(0)]).toBeUndefined();
    expect(draft().executions[key(1)]).toEqual([imported]);
    expect(addNotification).not.toHaveBeenCalled();
  });

  it('discards a pending import when another treasury is populated', async () => {
    const wrapper = await mountEditor();
    const editors = wrapper.findAllComponents(EditorExecution);
    const pending = deferred<string>();
    await startImport(editors[0], pending.promise);
    editors[1].vm.$emit('update:modelValue', [imported]);
    await flushPromises();
    expect(editors[0].props('disabled')).toBe(true);
    pending.resolve(content);
    await flushPromises();

    expect(draft().executions[key(0)]).toBeUndefined();
    expect(draft().executions[key(1)]).toEqual([imported]);
    expect(addNotification).not.toHaveBeenCalled();
  });

  it('rejects a captured callback immediately after a draft switch', async () => {
    const wrapper = await mountEditor();
    const callback = wrapper
      .findAllComponents(EditorExecution)[0]
      .props('importTransactions');
    route.params.key = 'b';

    expect(callback([imported])).toBe(false);
    expect(draft('a').executions).toEqual({});
    expect(draft('b').executions).toEqual({});
  });

  it('discards a pending import after switching drafts', async () => {
    const wrapper = await mountEditor();
    const editor = wrapper.findAllComponents(EditorExecution)[0];
    const instanceUid = editor.vm.$.uid;
    const pending = deferred<string>();
    await startImport(editor, pending.promise);
    route.params.key = 'b';
    await flushPromises();
    expect(wrapper.findAllComponents(EditorExecution)[0].vm.$.uid).not.toBe(
      instanceUid
    );
    pending.resolve(content);
    await flushPromises();

    expect(draft('a').executions).toEqual({});
    expect(draft('b').executions).toEqual({});
    expect(addNotification).not.toHaveBeenCalled();
  });

  it('discards a pending import after switching away and back to its draft', async () => {
    const wrapper = await mountEditor();
    const pending = deferred<string>();
    await startImport(
      wrapper.findAllComponents(EditorExecution)[0],
      pending.promise
    );
    route.params.key = 'b';
    await flushPromises();
    route.params.key = 'a';
    await flushPromises();
    pending.resolve(content);
    await flushPromises();

    expect(draft('a').executions).toEqual({});
    expect(draft('b').executions).toEqual({});
    expect(addNotification).not.toHaveBeenCalled();
  });

  it('discards a pending import after leaving the editor', async () => {
    const wrapper = await mountEditor();
    const pending = deferred<string>();
    await startImport(
      wrapper.findAllComponents(EditorExecution)[0],
      pending.promise
    );
    wrapper.unmount();
    wrappers.splice(wrappers.indexOf(wrapper), 1);
    pending.resolve(content);
    await flushPromises();

    expect(draft().executions).toEqual({});
    expect(addNotification).not.toHaveBeenCalled();
  });

  it('keeps a pending offchain import when another treasury changes', async () => {
    const wrapper = await mountEditor('s');
    const editors = wrapper.findAllComponents(EditorExecution);
    const pending = deferred<string>();
    await startImport(editors[0], pending.promise);
    editors[1].vm.$emit('update:modelValue', [imported]);
    await flushPromises();
    pending.resolve(content);
    await flushPromises();

    expect(draft('a', 's').executions[key(0)]).toHaveLength(1);
    expect(draft('a', 's').executions[key(1)]).toEqual([imported]);
    expect(addNotification).toHaveBeenCalledWith(
      'success',
      'Imported 1 transaction'
    );
  });

  it('keeps the callback, chain and delegatecall mode from before reading the file', async () => {
    strategies.value[0].type = 'safeSnap';
    const accept = vi.fn(
      (transactions: Transaction[]) => transactions.length > 0
    );
    const replacement = vi.fn(() => true);
    const wrapper = shallowMount(EditorExecution, {
      props: {
        space,
        strategy: strategies.value[0],
        modelValue: [],
        importTransactions: accept
      }
    });
    wrappers.push(wrapper);
    const pending = deferred<string>();
    await startImport(wrapper, pending.promise);
    strategies.value[0].treasury.chainId = '10';
    await wrapper.setProps({
      importTransactions: replacement,
      strategy: { ...strategies.value[0], type: 'SimpleQuorumAvatar' }
    });
    pending.resolve(
      JSON.stringify({
        chainId: '1',
        transactions: [{ to, value: '0', data: '0x', operation: '1' }]
      })
    );
    await flushPromises();

    expect(accept).toHaveBeenCalledOnce();
    expect(accept.mock.calls[0][0][0].operation).toBe('1');
    expect(replacement).not.toHaveBeenCalled();
    expect(addNotification).toHaveBeenCalledWith(
      'success',
      'Imported 1 transaction'
    );
  });

  it('does not invoke the import callback when disabled while reading', async () => {
    const accept = vi.fn(
      (transactions: Transaction[]) => transactions.length > 0
    );
    const wrapper = shallowMount(EditorExecution, {
      props: {
        space,
        strategy: strategies.value[0],
        modelValue: [],
        importTransactions: accept
      }
    });
    wrappers.push(wrapper);
    const pending = deferred<string>();
    await startImport(wrapper, pending.promise);
    await wrapper.setProps({ disabled: true });
    pending.resolve(content);
    await flushPromises();

    expect(accept).not.toHaveBeenCalled();
    expect(addNotification).not.toHaveBeenCalled();
  });

  it.each(['treasury', 'type', 'removed'])(
    'rejects a captured callback after an execution change: %s',
    async change => {
      const wrapper = await mountEditor();
      const callback = wrapper
        .findAllComponents(EditorExecution)[0]
        .props('importTransactions');
      if (change === 'treasury') {
        strategies.value[0].treasury.address =
          '0x0000000000000000000000000000000000000003';
      } else if (change === 'type') {
        strategies.value[0].type = 'safeSnap';
      } else {
        strategies.value.shift();
      }

      expect(callback([imported])).toBe(false);
      expect(draft().executions).toEqual({});
    }
  );
});
