// What crawlers and link previews get from snapshot-sidekick (sh5.co), on snapshot.box paths:
// - snapshot.box/s:ens.eth.md and snapshot.box/s:ens.eth/proposal/0x….md: spaces and proposals as Markdown
// - snapshot.box/s:ens.eth/proposal/0x…: for bots, the share page with the title, description and image
// People keep getting the app: this function steps aside and _redirects sends them to /#/.
// An edge function because _redirects can't match a ".md" ending or a user agent.
const ORIGIN = 'https://sh5.co';
// The same rule as sidekick's share links.
const BOT =
  /bot|crawl|spider|preview|scrap|facebookexternalhit|whatsapp|mastodon|bluesky|cardyb|embedly|iframely|vkshare|pinterest|snapchat|skype|curl|wget|python|axios|go-http|okhttp|java\//i;

export default async (request: Request): Promise<Response | undefined> => {
  const url = new URL(request.url);
  const userAgent = request.headers.get('user-agent') ?? '';
  const isMarkdown = url.pathname.endsWith('.md');
  if (!isMarkdown && userAgent && !BOT.test(userAgent)) return;

  try {
    const res = await fetch(`${ORIGIN}${url.pathname}`, {
      headers: { 'user-agent': userAgent },
      redirect: isMarkdown ? 'follow' : 'manual',
      signal: AbortSignal.timeout(20000)
    });
    if (isMarkdown) {
      return new Response(res.body, {
        status: res.status,
        headers: {
          'content-type': res.headers.get('content-type') ?? 'text/plain',
          'cache-control': res.headers.get('cache-control') ?? 'no-store'
        }
      });
    }
    // Anything but the share page (an unknown proposal, sidekick down): the usual redirect to the app.
    if (res.status !== 200) return;
    // The page names its own URL: the snapshot.box link, not the sh5.co one.
    const html = (await res.text()).replace(
      /(<meta property="og:url" content=")https:\/\/sh5\.co\//,
      `$1${url.origin}/`
    );
    return new Response(html, {
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store'
      }
    });
  } catch {
    if (!isMarkdown) return;
    return new Response('Temporarily unavailable', {
      status: 502,
      headers: { 'cache-control': 'no-store' }
    });
  }
};

export const config = {
  pattern: '^/[^/]+(\\.md|/proposal/[^/.]+(\\.md)?)$',
  cache: 'manual'
};
