import { useQueryClient } from '@tanstack/vue-query';
import { BASIC_CHOICES } from '@/helpers/constants';
import { clone, lsGet, lsSet, omit } from '@/helpers/utils';
import { getSpaces } from '@/queries/spaces';
import { Draft, Drafts, Privacy, Space, VoteType } from '@/types';

const PREFERRED_VOTE_TYPE = 'basic';

const storedProposals = lsGet('proposals', {});
const processedProposals = Object.fromEntries(
  Object.entries(storedProposals).map(([k, v]) => {
    const processed = v as any;

    // convert single treasury to multiple treasuries format
    if ('execution' in processed && 'executionStrategy' in processed) {
      processed.executions =
        processed.executionStrategy && processed.execution
          ? {
              [processed.executionStrategy.address]: processed.execution
            }
          : {};

      delete processed.execution;
      delete processed.executionStrategy;
    }

    return [k, v];
  })
);

const proposals = reactive<Drafts>(processedProposals as Drafts);
const spaceVoteTypes = new Map<string, VoteType[]>();
const spacePrivacies = new Map<string, Privacy[]>();
const spaceTemplate = new Map<string, string>();

function generateId() {
  return (Math.random() + 1).toString(36).substring(7);
}

function getSpaceId(draftId: string) {
  return draftId.split(':').slice(0, 2).join(':');
}

export function useEditor() {
  const queryClient = useQueryClient();

  const drafts = computed(() => {
    return Object.entries(removeEmpty(proposals))
      .map(([k, value]) => {
        const [networkId, space, key] = k.split(':');

        return {
          id: k,
          networkId,
          space,
          key,
          ...value
        };
      })
      .sort((a, b) => b.updatedAt - a.updatedAt);
  });

  function removeEmpty(proposals: Drafts): Drafts {
    return Object.entries(proposals).reduce((acc, [id, proposal]) => {
      const { executions, type, body, privacy, choices, labels, ...rest } =
        omit(proposal, ['updatedAt']);

      const spaceId = getSpaceId(id);
      const allowedTypes = spaceVoteTypes.get(spaceId);
      const allowedPrivacies = spacePrivacies.get(spaceId);

      const hasFormValues = Object.values(rest).some(val => !!val);
      const hasChangedVotingType = type !== allowedTypes?.[0];
      const hasChangedPrivacy = privacy !== allowedPrivacies?.[0];
      const hasChangedBody = body !== spaceTemplate.get(spaceId);
      const hasFormChoices =
        type !== 'basic' && (choices || []).some(val => !!val);

      if (
        Object.keys(executions).length === 0 &&
        labels.length === 0 &&
        !hasFormValues &&
        !hasChangedVotingType &&
        !hasChangedPrivacy &&
        !hasChangedBody &&
        !hasFormChoices
      ) {
        return acc;
      }

      if (proposal.proposalId !== null) {
        return acc;
      }

      return {
        ...acc,
        [id]: proposal
      };
    }, {});
  }

  async function fetchSpacesAndStore(ids: string[]) {
    if (!ids.length) return;

    const unavailableIds = ids.filter(
      id => !queryClient.getQueryData(['spaces', 'detail', id])
    );

    const spaces = await getSpaces({
      id_in: unavailableIds
    });

    for (const space of spaces) {
      queryClient.setQueryData(
        ['spaces', 'detail', `${space.network}:${space.id}`],
        space
      );
    }
  }

  async function getInitialProposalBody(spaceId: string) {
    if (spaceTemplate.has(spaceId)) {
      return spaceTemplate.get(spaceId) as string;
    }

    await fetchSpacesAndStore([spaceId]);
    const space = queryClient.getQueryData<Space>([
      'spaces',
      'detail',
      spaceId
    ]);

    const template = space?.template ?? '';

    spaceTemplate.set(spaceId, template);

    return template;
  }

  async function setSpacesVoteTypeAndPrivacy(spaceIds: string[]) {
    await fetchSpacesAndStore(spaceIds);

    for (const id of spaceIds) {
      const space = queryClient.getQueryData<Space>(['spaces', 'detail', id]);
      if (!space) continue;

      const types = space.voting_types.includes(PREFERRED_VOTE_TYPE)
        ? (Array.from(
            new Set([PREFERRED_VOTE_TYPE, ...space.voting_types])
          ) as VoteType[])
        : space.voting_types;

      spaceVoteTypes.set(id, types);
      spacePrivacies.set(
        id,
        space.privacy === 'any' ? ['none', 'shutter'] : [space.privacy]
      );
    }
  }

  async function createDraft(
    spaceId: string,
    payload?: Partial<Draft> & { proposalId?: number | string },
    draftKey?: string
  ) {
    await setSpacesVoteTypeAndPrivacy([spaceId]);

    const allowedTypes = spaceVoteTypes.get(spaceId);
    const allowedPrivacies = spacePrivacies.get(spaceId);

    if (!allowedTypes?.length || !allowedPrivacies?.length) {
      throw new Error(`Missing space settings for space ID: ${spaceId}`);
    }

    const type = payload?.type || allowedTypes[0];
    const privacy: Privacy = payload?.privacy || allowedPrivacies[0];
    const choices = type === 'basic' ? clone(BASIC_CHOICES) : Array(2).fill('');

    const id = draftKey ?? generateId();
    const key = `${spaceId}:${id}`;

    const body = await getInitialProposalBody(spaceId);

    proposals[key] = {
      title: '',
      body,
      discussion: '',
      type,
      choices,
      privacy,
      labels: [],
      executions: Object.create(null),
      updatedAt: Date.now(),
      proposalId: null,
      ...payload
    };

    return id;
  }

  function removeDraft(key: string) {
    delete proposals[key];
  }

  async function refreshDrafts() {
    const ids = Object.keys(proposals).map(getSpaceId);

    if (!ids.length) return;

    await setSpacesVoteTypeAndPrivacy(Array.from(new Set(ids)));

    for (const [id, proposal] of Object.entries(proposals)) {
      const spaceId = getSpaceId(id);
      const allowedTypes = spaceVoteTypes.get(spaceId);
      const allowedPrivacies = spacePrivacies.get(spaceId);

      if (!allowedTypes?.length || !allowedPrivacies?.length) {
        removeDraft(id);
        continue;
      }

      if (!allowedTypes.includes(proposal.type)) {
        proposal.type = allowedTypes[0];
      }

      if (!allowedPrivacies.includes(proposal.privacy)) {
        proposal.privacy = allowedPrivacies[0];
      }
    }
  }

  watch(proposals, async () => {
    lsSet('proposals', removeEmpty(proposals));
  });

  return {
    proposals,
    drafts,
    generateId,
    createDraft,
    removeDraft,
    refreshDrafts
  };
}
