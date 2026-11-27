const modalAccountOpen = ref(false);
const modalAccountWithoutDismissOpen = ref(false);

function resetAccountModal() {
  modalAccountOpen.value = false;
  modalAccountWithoutDismissOpen.value = false;
}

export function useModal() {
  return {
    modalAccountOpen,
    modalAccountWithoutDismissOpen,
    resetAccountModal
  };
}
