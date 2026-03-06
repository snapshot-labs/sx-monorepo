import { ref } from 'vue';

const isModalOpen = ref(false);

export function useModal() {
  function open() {
    isModalOpen.value = true;
  }

  function close() {
    isModalOpen.value = false;
  }

  return { isModalOpen, open, close };
}
