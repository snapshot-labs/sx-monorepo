export function useTitle(title?: string) {
  const { app } = useApp();

  const setTitle = (newTitle: string) => {
    document.title = newTitle;
  };

  onBeforeUnmount(() => {
    document.title = app.value.app_name;
  });

  if (title) {
    setTitle(title);
  }

  return {
    setTitle
  };
}
