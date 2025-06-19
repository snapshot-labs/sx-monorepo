<script setup lang="ts">
import { getTopic } from '@/helpers/townhall/api';
import { Space as TownhallSpace } from '@/helpers/townhall/types';
import { sleep } from '@/helpers/utils';
import { Space } from '@/types';

const props = defineProps<{ space: Space; townhallSpace: TownhallSpace }>();

const route = useRoute();
const router = useRouter();
const { sendTopic } = useTownhall();
const { addNotification } = useUiStore();
const { setTitle } = useTitle();
const { setContext, setVars, openChatbot } = useChatbot();

const title = ref(route.query.title as string);
const body = ref('');
const discussion = ref('');
const submitLoading = ref(false);

const TITLE_DEFINITION = {
  type: 'string',
  title: 'Ask an open question',
  minLength: 1,
  maxLength: 100
};

const BODY_DEFINITION = {
  type: 'string',
  format: 'long',
  title: 'Context',
  maxLength: 1e3,
  examples: ['Add more context…']
};

const DISCUSSION_DEFINITION = {
  type: 'string',
  format: 'uri',
  title: 'Discussion',
  maxLength: 200,
  examples: ['e.g. https://forum.balancer.fi/t/proposal…']
};

async function handleSubmit() {
  submitLoading.value = true;

  try {
    const res = await sendTopic(
      props.townhallSpace.space_id,
      title.value,
      body.value,
      discussion.value
    );
    if (!res) return;

    const [spaceId, topicId] = res.result.events.find(
      event => event.key === 'new_topic'
    ).data;

    while (true) {
      try {
        await getTopic(spaceId, topicId);
        break;
      } catch (e: unknown) {
        if (e instanceof Error && e.message.includes('Row not found')) {
          await sleep(500);
          continue;
        }

        throw e;
      }
    }

    await router.push({
      name: 'space-townhall-topic',
      params: { id: topicId }
    });
  } catch (e) {
    addNotification('error', e.message);
  } finally {
    submitLoading.value = false;
  }
}

watchEffect(() => {
  setTitle(`New topic - ${props.space.name}`);
  setContext({
    purpose:
      'This is where you create a new Topic - often an open question for consensus-driven discussion, similar to Pol.is. Your Topic will invite others to share their perspectives and find common ground.',
    data: {
      space: {
        id: props.space.id,
        name: props.space.name,
        about: props.space.about
      }
    },
    inputs: {
      title: {
        value: title.value,
        definition: TITLE_DEFINITION
      },
      body: {
        value: body.value,
        definition: BODY_DEFINITION
      }
    }
  });
  setVars({ title, body });
});
</script>

<template>
  <div class="pt-5">
    <UiContainer class="!max-w-[710px] s-box space-y-3">
      <div>
        <UiInputString
          v-model="title"
          :definition="TITLE_DEFINITION"
          :required="true"
        />
      </div>
      <div class="s-base">
        <UiComposer v-model="body" :definition="BODY_DEFINITION" />
      </div>
      <UiInputString v-model="discussion" :definition="DISCUSSION_DEFINITION" />
      <UiLinkPreview :url="discussion" />
      <div class="flex gap-2.5 items-center">
        <UiButton
          class="primary flex items-center space-x-1"
          :disabled="submitLoading"
          @click="handleSubmit"
        >
          <div>Publish</div>
          <IH-paper-airplane class="rotate-90 relative left-[2px]" />
        </UiButton>
        <div v-if="title?.length > 10">
          <a
            class="flex items-center gap-1.5"
            @click="openChatbot('Improve writing')"
          >
            <IH-sparkles />
            Improve writing
          </a>
        </div>
      </div>
    </UiContainer>
  </div>
</template>
