<script setup lang="ts">
import { toRefs, computed } from 'vue';
import { useEditor } from '@/composables/useEditor';

const props = defineProps<{
  open: boolean;
  space: string;
}>();

defineEmits<{
  (e: 'close');
}>();

const { drafts, removeDraft } = useEditor();
const { open } = toRefs(props);

const spaceDrafts = computed(() => drafts.value.filter(draft => draft.space === props.space));
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
          class="py-3 px-4 border-b last:border-b-0 flex justify-between items-center"
        >
          <router-link
            :to="{
              name: 'editor',
              params: { id: space, key: proposal.key }
            }"
            @click="$emit('close')"
          >
            {{ proposal.title || 'Untitled' }}
            <span class="text-skin-text">#{{ proposal.key }}</span>
          </router-link>
          <a @click="removeDraft(proposal.id)">
            <IH-trash class="mr-2" />
          </a>
        </div>
      </div>
      <div v-else class="p-4 text-center">There isn't any drafts yet!</div>
    </div>
  </UiModal>
</template>
