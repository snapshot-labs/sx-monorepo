import { requireBearerAuth } from '@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js';
import { mcpAuthRouter } from '@modelcontextprotocol/sdk/server/auth/router.js';
import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { type NextFunction, type Request, type Response } from 'express';
import pkg from '../package.json' with { type: 'json' };
import { SnapshotOAuthProvider } from './auth.js';
import instructions from './instructions.md' with { type: 'text' };
import logger from './logger.js';
import {
  createResolveContext,
  registerFollowTool,
  registerProposeTool,
  registerQueryTool,
  registerSchemaTool,
  registerVoteTool,
  registerWhoamiTool
} from './tools.js';

// Log strays instead of dying silently. An uncaught exception leaves the
// process in an undefined state, so exit and let the orchestrator restart.
process.on('uncaughtException', (err: unknown) => {
  logger.fatal({ err }, 'uncaught exception');
  process.exit(1);
});

process.on('unhandledRejection', (err: unknown) => {
  logger.error({ err }, 'unhandled rejection');
});

const ICONS = [
  { src: 'https://snapshot.box/favicon-dark.svg', mimeType: 'image/svg+xml', sizes: ['any'], theme: 'light' as const },
  { src: 'https://snapshot.box/favicon.svg', mimeType: 'image/svg+xml', sizes: ['any'], theme: 'dark' as const }
];

function createMcpServer(mode: 'http' | 'stdio'): McpServer {
  const server = new McpServer(
    {
      name: 'snapshot',
      title: 'Snapshot',
      version: pkg.version,
      websiteUrl: 'https://snapshot.box',
      icons: ICONS
    },
    { instructions }
  );
  const resolveContext = createResolveContext(mode);
  registerSchemaTool(server);
  registerWhoamiTool(server, resolveContext);
  registerQueryTool(server, resolveContext);
  registerVoteTool(server, resolveContext);
  registerProposeTool(server, resolveContext);
  registerFollowTool(server, resolveContext);
  return server;
}

if (process.argv.includes('--stdio')) {
  try {
    await createMcpServer('stdio').connect(new StdioServerTransport());
    logger.info('MCP server connected over stdio');
  } catch (e) {
    logger.fatal({ err: e }, 'failed to start stdio server');
    // eslint-disable-next-line unicorn/no-process-exit
    process.exit(1);
  }
} else {
  const port = Number(process.env.PORT ?? 8080);
  const baseUrl = process.env.BASE_URL ?? `http://localhost:${port}`;

  const app = createMcpExpressApp({ host: '0.0.0.0' });
  app.set('trust proxy', 1);

  app.get('/', (_req: Request, res: Response): void => {
    const commit = process.env.COMMIT_HASH ?? '';
    const version = commit
      ? `${pkg.version}#${commit.substring(0, 7)}`
      : pkg.version;
    res.json({ name: 'snapshot-mcp', version });
  });

  const provider = new SnapshotOAuthProvider();
  app.use(mcpAuthRouter({ provider, issuerUrl: new URL(baseUrl) }));
  app.get('/auth/callback', provider.callback);

  const authMiddleware = requireBearerAuth({ verifier: provider });

  // Stateless mode: a fresh transport per request so deploys never strand an active session.
  app.post('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on('close', () => { transport.close().catch(() => {}); });
    await createMcpServer('http').connect(transport);
    await transport.handleRequest(req, res, req.body);
  });

  // Express forwards rejections from the handlers above (and auth/OAuth router) here.
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction): void => {
    logger.error({ err }, 'request error');
    if (!res.headersSent) res.status(500).json({ error: 'internal_server_error' });
  });

  app.listen(port, () => logger.info({ port, baseUrl }, 'MCP server listening'));
}
