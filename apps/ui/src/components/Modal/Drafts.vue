<script setup lang="ts">
const props = defineProps<{
  open: boolean;
  networkId: string;
  space: string;
}>();

defineEmits<{
  (e: 'close');
}>();

const route = useRoute();
const router = useRouter();
const { drafts, removeDraft } = useEditor();
const { open } = toRefs(props);

const spaceDrafts = computed(() =>
  drafts.value.filter(
    draft => draft.space === props.space && draft.networkId === props.networkId
  )
);

function handleRemoveDraft(id: string) {
  const currentId = `${props.networkId}:${props.space}:${route.params.key}`;

  if (currentId === id) {
    router.replace({ name: 'space-editor' });
  }

  removeDraft(id);
}
</script>

<template>
  <UiModal :open="open" @close="$emit('close')">
    <template #header>
      <h3 v-text="'Drafts'" />
    </template>
    <div>
      <div v-if="spaceDrafts.length > 0">
        <div
          v-for="proposal in spaceDrafts"
          :key="proposal.id"
          class="py-3 px-4 border-b last:border-b-0 flex justify-between items-center space-x-2"
        >
          <AppLink
            :to="{
              name: 'space-editor',
              params: { space: `${networkId}:${space}`, key: proposal.key },
              query: route.query
            }"
            @click="$emit('close')"
          >
            {{ proposal.title || 'Untitled' }}
            <span class="text-skin-text">#{{ proposal.key }}</span>
          </AppLink>
          <button type="button" @click="handleRemoveDraft(proposal.id)">
            <IH-trash />
          </button>
        </div>
      </div>
      <div v-else class="p-4 text-center">There isn't any drafts yet!</div>
    </div>
  </UiModal>
</template>
