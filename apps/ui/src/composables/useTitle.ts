const DEFAULT_TITLE = 'Snapshot';

export function useTitle(title?: string) {
  const setTitle = (newTitle: string) => {
    document.title = newTitle;
  };

  onBeforeUnmount(() => {
    document.title = DEFAULT_TITLE;
  });

  if (title) {
    setTitle(title);
  }

  return {
    setTitle
  };
}
