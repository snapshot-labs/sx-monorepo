<script setup>
import { toRefs } from 'vue';
import { useEditor } from '@/composables/useEditor';

const props = defineProps({
  open: Boolean,
  space: String
});

defineEmits(['close']);

const { proposals } = useEditor();
const { open } = toRefs(props);
</script>

<template>
  <UiModal :open="open" @close="$emit('close')">
    <template v-slot:header>
      <h3 v-text="'Drafts'" />
    </template>
    <div>
      <div v-if="Object.keys(proposals).length > 0">
        <router-link
          @click="$emit('close')"
          v-for="(proposal, i) in proposals"
          :key="i"
          :to="{ name: 'editor', params: { id: space, key: i.split(':')[1] } }"
          class="py-3 px-4 border-b block last:border-b-0"
        >
          {{ proposal.title || 'Untitled' }}
          <span class="float-right">#{{ i.split(':')[1] }}</span>
        </router-link>
      </div>
      <div v-else class="p-4 text-center">There isn't any drafts yet!</div>
    </div>
  </UiModal>
</template>
