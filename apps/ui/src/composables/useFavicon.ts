const DEFAULT_FAVICONS: Record<string, string> = {
  '(prefers-color-scheme: dark)': '/favicon.svg',
  '(prefers-color-scheme: light)': '/favicon-dark.svg'
};

export function useFavicon(favicon?: string) {
  const setFavicon = (newFavicon: string | null) => {
    document.head
      .querySelectorAll<HTMLLinkElement>('link[rel="icon"]')
      .forEach(el => {
        el.href = newFavicon || DEFAULT_FAVICONS[el.media] || '/favicon.svg';
      });
  };

  if (favicon) {
    setFavicon(favicon);
  }

  return {
    setFavicon
  };
}
