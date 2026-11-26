import { useModalOpen } from '@snapshot-labs/tune';

// Set by <UiModal> in Tune
const modalOpen = useModalOpen();
const modalAccountOpen = ref(false);
const modalAccountWithoutDismissOpen = ref(false);

function resetAccountModal() {
  modalAccountOpen.value = false;
  modalAccountWithoutDismissOpen.value = false;
}

export function useModal() {
  return {
    modalOpen,
    modalAccountOpen,
    modalAccountWithoutDismissOpen,
    resetAccountModal
  };
}
