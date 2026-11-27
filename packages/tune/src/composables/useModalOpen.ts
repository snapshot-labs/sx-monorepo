const isModalOpen = ref(false);

/** Whether a `<UiModal>` is open, for the app to lock scrolling and gestures. */
export function useModalOpen() {
  return isModalOpen;
}
