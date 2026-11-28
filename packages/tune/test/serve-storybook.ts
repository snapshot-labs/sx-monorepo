/// <reference types="bun" />
// Serves the static Storybook build to the visual tests: `bun test/serve-storybook.ts <port>`
Bun.serve({
  port: Number(process.argv[2]),
  hostname: 'localhost',
  async fetch(req) {
    const { pathname } = new URL(req.url);
    const file = Bun.file(
      `storybook-static${pathname.endsWith('/') ? `${pathname}index.html` : pathname}`
    );
    return (await file.exists())
      ? new Response(file)
      : new Response('Not found', { status: 404 });
  }
});
