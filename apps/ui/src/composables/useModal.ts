import { useModal as useTuneModal } from '@snapshot-labs/tune';

const { modalOpen } = useTuneModal();
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
