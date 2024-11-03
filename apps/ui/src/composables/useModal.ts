const modalOpen = ref(false);
const modalAccountOpen = ref(false);
const modalTermsOpen = ref(false);
const modalAccountWithoutDismissOpen = ref(false);

function resetAccountModal() {
  modalAccountOpen.value = false;
  modalTermsOpen.value = false;
  modalAccountWithoutDismissOpen.value = false;
}

export function useModal() {
  return {
    modalOpen,
    modalAccountOpen,
    modalTermsOpen,
    modalAccountWithoutDismissOpen,
    resetAccountModal
  };
}
