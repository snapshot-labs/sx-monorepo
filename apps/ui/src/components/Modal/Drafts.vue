<script setup>
import { toRefs } from 'vue';
import { useEditor } from '@/composables/useEditor';

const props = defineProps({
  open: Boolean,
  space: String
});

defineEmits(['close']);

const { proposals, removeDraft } = useEditor();
const { open } = toRefs(props);
</script>

<template>
  <UiModal :open="open" @close="$emit('close')">
    <template #header>
      <h3 v-text="'Drafts'" />
    </template>
    <div>
      <div v-if="Object.keys(proposals).length > 0">
        <div
          v-for="(proposal, i) in proposals"
          :key="i"
          class="py-3 px-4 border-b last:border-b-0 flex justify-between items-center"
        >
          <router-link
            :to="{
              name: 'editor',
              params: { id: space, key: i.split(':')[1] }
            }"
            @click="$emit('close')"
          >
            {{ proposal.title || 'Untitled' }}
            <span class="text-skin-text">#{{ i.split(':')[1] }}</span>
          </router-link>
          <a @click="removeDraft(i)">
            <IH-trash class="mr-2" />
          </a>
        </div>
      </div>
      <div v-else class="p-4 text-center">There isn't any drafts yet!</div>
    </div>
  </UiModal>
</template>
