const DEFAULT_FAVICON = '/favicon.svg';

export function useFavicon(favicon?: string) {
  const setFavicon = (newFavicon: string | null) => {
    if (!newFavicon) return setFavicon(DEFAULT_FAVICON);

    document.head
      .querySelectorAll<HTMLLinkElement>('link[rel="icon"]')
      .forEach(el => (el.href = newFavicon));
  };

  if (favicon) {
    setFavicon(favicon);
  }

  return {
    setFavicon
  };
}
