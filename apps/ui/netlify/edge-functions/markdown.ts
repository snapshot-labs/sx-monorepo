// Spaces and proposals as Markdown for crawlers and AI agents: snapshot.box/s:ens.eth.md and
// snapshot.box/s:ens.eth/proposal/0x….md, served by snapshot-sidekick. An edge function because
// _redirects can't match a ".md" ending without also catching the app's links.
const ORIGIN = 'https://sh5.co';

export default async (request: Request): Promise<Response> => {
  const { pathname } = new URL(request.url);
  try {
    const res = await fetch(`${ORIGIN}${pathname}`, {
      signal: AbortSignal.timeout(20000)
    });
    return new Response(res.body, {
      status: res.status,
      headers: {
        'content-type': res.headers.get('content-type') ?? 'text/plain',
        'cache-control': res.headers.get('cache-control') ?? 'no-store'
      }
    });
  } catch {
    return new Response('Temporarily unavailable', {
      status: 502,
      headers: { 'cache-control': 'no-store' }
    });
  }
};

export const config = {
  pattern: '^/[^/]+(/proposal/[^/]+)?\\.md$',
  cache: 'manual'
};
