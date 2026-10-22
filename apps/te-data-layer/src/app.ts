/**
 * The keypers' data-layer HTTP API, served on top of Snapshot's hub.
 *
 * The keypers and their coordinator live in a separate codebase. This service
 * matches their API exactly (paths, bodies, status codes), so they only need to be
 * configured to point here.
 *
 * It has no database and no signing keys; everything comes from the hub. That makes
 * it safe to run several replicas, and limits a compromise here to withholding or
 * reordering data: every committee artifact carries a keyper or publisher signature
 * this service cannot forge. Ballots are the exception. They come from voters and
 * their authenticity rests on the sequencer's check, so the hub and this service
 * must sit inside one trust boundary.
 *
 * It only maps shapes and forwards statuses. Protocol writes that Snapshot has no
 * equivalent for answer 501 (see `UNSUPPORTED`).
 */

import express, { Express, Request, Response, Router } from 'express';
import { BadElectionId, toProposalId } from './eid';
import { HubError, hubGet, hubGetRaw, hubPost, hubPostRaw } from './hub';
import log from './log';

/**
 * Prefix of the read-only mount used by the keypers.
 *
 * The coordinator uses the root, where it reads and writes (keypers send their
 * signed submissions through it). Keypers append this prefix to their configured
 * base URL (`services/keyper` → `resolve_read_url`), so it must not be renamed.
 * Mounting only reads here means a keyper cannot reach a write route.
 */
const PORT_READ_PREFIX = '/port';

/** Writes the protocol defines but Snapshot has no equivalent for. */
const UNSUPPORTED: Array<{ path: string; reason: string }> = [
  {
    path: '/elections',
    reason:
      'elections are created as Snapshot proposals through the sequencer, not here'
  },
  {
    path: '/elections/:eid/cancel',
    reason: 'Snapshot has no proposal cancellation'
  },
  {
    path: '/elections/:eid/ballots',
    reason:
      'ballots are submitted as signed Snapshot votes through the sequencer, not here'
  }
];

function fail(res: Response, status: number, message: string): void {
  (res as any).failureReason = message;
  res.status(status).json({ error: message, message });
}

function accessLog(req: Request, res: Response, next: () => void): void {
  const startedAt = Date.now();
  const path = req.originalUrl.split('?')[0] ?? req.path;
  res.on('finish', () => {
    const ms = Date.now() - startedAt;
    const match = /\/elections\/([0-9a-fA-Fx]+)/.exec(path);
    const eid = match?.[1] ? ` election=${match[1].replace(/^0x/, '')}` : '';
    const via = path.startsWith(PORT_READ_PREFIX) ? ' via=port' : '';
    const reason = (res as any).failureReason
      ? ` reason="${(res as any).failureReason}"`
      : '';
    const line = `[te-dl] ${req.method} ${path}${eid} status=${res.statusCode}${via} ${ms}ms${reason}`;

    if (res.statusCode >= 500) log.error(line);
    else if (res.statusCode >= 400) log.warn(line);
    else if (req.method === 'GET') log.debug(line);
    else log.info(line);
  });
  next();
}

/** The `:eid` path segment. Express types it as optional; a route match guarantees it. */
function electionIdParam(req: Request): string {
  const eid = req.params.eid;
  if (typeof eid !== 'string') {
    throw new BadElectionId('missing election id');
  }
  return eid;
}

/**
 * Runs a handler and maps errors to statuses: a bad election id is 400, a hub
 * error keeps the hub's status, anything else is 500. Never 404 for an internal
 * error: the coordinator reads 404 as "election does not exist" and gives up on it.
 */
function handle(
  fn: (req: Request, res: Response) => Promise<void>
): (req: Request, res: Response) => void {
  return (req, res) => {
    fn(req, res).catch(err => {
      if (err instanceof BadElectionId) return fail(res, 400, err.message);
      if (err instanceof HubError) return fail(res, err.status, err.message);
      log.error(`[te-dl] ${req.method} ${req.path}: ${err?.message || err}`);
      return fail(res, 500, 'internal error');
    });
  };
}

export function buildApp(): Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(
    express.json({
      limit: '20mb',
      verify: (req: any, _res, buf) => {
        // Raw text for the aggregate and result routes, whose large integers
        // must not be parsed into doubles.
        req.rawBody = buf.toString('utf8');
      }
    })
  );
  app.use(accessLog);

  app.get('/health', (req, res) => {
    res.json({ ok: true, uptimeS: Math.round(process.uptime()) });
  });

  // All reads, mounted at the root for the coordinator and under /port for the
  // keypers, so both always get the same answers.
  const reads = Router();

  /**
   * Tier 0: trusted for availability only. Aggregates, decryption shares and the
   * result are signed by keypers or the publisher, so a wrong answer is detected.
   * Ballots are checked only by the sequencer (pseudonym derived from the
   * EIP-712-signed voter) and that proof is not stored with them, which is why the
   * hub and this service share one trust boundary.
   */
  reads.get('/capability', (req, res) => {
    res.json({ verifiabilityTier: 0 });
  });

  reads.get(
    '/elections',
    handle(async (req, res) => {
      const { electionIds } = await hubGet<{ electionIds: string[] }>(
        '/api/te_sgp_elections'
      );
      // Keep the `0x` prefix. Path segments use bare hex, but byte fields in JSON
      // bodies must be `0x`-prefixed; without it the client rejects the whole list
      // and the coordinator sees no elections.
      res.json({ electionIds });
    })
  );

  reads.get(
    '/elections/:eid',
    handle(async (req, res) => {
      const id = toProposalId(electionIdParam(req));
      res.json(
        await hubGet<Record<string, unknown>>(
          `/api/proposal/${id}/te_sgp_election`
        )
      );
    })
  );

  app.post(
    '/elections/:eid/dkg',
    handle(async (req, res) => {
      const id = toProposalId(electionIdParam(req));
      // No keyper index: the hub recovers it from the signature, so a submission
      // only counts for whoever signed it.
      await hubPost(`/api/proposal/${id}/te_sgp_dkg`, {
        pkElection: req.body?.pkElection,
        committeePKs: req.body?.committeePKs,
        keyperSig: req.body?.keyperSig
      });
      res.status(204).end();
    })
  );

  app.post(
    '/elections/:eid/aggregate',
    handle(async (req, res) => {
      const id = toProposalId(electionIdParam(req));
      // Forwarded as raw text: `totalAdmittedWeight` can exceed 2^53 and is
      // covered by the signature. The hub recovers the keyper from the signature.
      await hubPostRaw(
        `/api/proposal/${id}/te_aggregate`,
        (req as any).rawBody
      );
      res.status(204).end();
    })
  );

  app.post(
    '/elections/:eid/shares',
    handle(async (req, res) => {
      const id = toProposalId(electionIdParam(req));
      await hubPost(`/api/proposal/${id}/te_sgp_decryption_share`, {
        share: req.body?.share,
        keyperSig: req.body?.keyperSig
      });
      res.status(204).end();
    })
  );

  app.post(
    '/elections/:eid/result',
    handle(async (req, res) => {
      const id = toProposalId(electionIdParam(req));
      // Forwarded as raw text: the totals can exceed a double's exact range and
      // are signed by the publisher, so re-encoding would break the signature.
      await hubPostRaw(`/api/proposal/${id}/te_result`, (req as any).rawBody);
      res.status(204).end();
    })
  );

  app.post(
    '/elections/:eid/tally-stalled',
    handle(async (req, res) => {
      const id = toProposalId(electionIdParam(req));
      // Both signatures are forwarded; the hub decides which key may sign which
      // direction.
      await hubPost(`/api/proposal/${id}/te_tally_stalled`, {
        stalled: req.body?.stalled,
        issuedAt: req.body?.issuedAt,
        resultPublisherSig: req.body?.resultPublisherSig,
        adminSig: req.body?.adminSig,
        // Coordinator's explanation shown in the UI. Unsigned; the hub caps it.
        reason: req.body?.reason
      });
      res.status(204).end();
    })
  );

  reads.get(
    '/elections/:eid/dkg',
    handle(async (req, res) => {
      const id = toProposalId(electionIdParam(req));
      const { submissions } = await hubGet<{ submissions: unknown[] }>(
        `/api/proposal/${id}/te_sgp_dkg`
      );
      res.json({ submissions });
    })
  );

  reads.get(
    '/elections/:eid/dkg/finalized',
    handle(async (req, res) => {
      const id = toProposalId(electionIdParam(req));
      // Read from the election; the key is set once the committee reaches quorum.
      const { finalizedKey } = await hubGet<{ finalizedKey: unknown }>(
        `/api/proposal/${id}/te_sgp_election`
      );
      res.json({ finalizedKey: finalizedKey ?? null });
    })
  );

  reads.get(
    '/elections/:eid/ballots/count',
    handle(async (req, res) => {
      const id = toProposalId(electionIdParam(req));
      const { count } = await hubGet<{ count: number }>(
        `/api/proposal/${id}/te_sgp_ballots?countOnly=1`
      );
      res.json({ count });
    })
  );

  reads.get(
    '/elections/:eid/ballots',
    handle(async (req, res) => {
      const id = toProposalId(electionIdParam(req));
      const start = Number(req.query.start ?? 0);
      const count = Number(req.query.count ?? 0);
      const params = new URLSearchParams();
      if (Number.isFinite(start) && start > 0) {
        params.set('start', String(start));
      }
      if (Number.isFinite(count) && count > 0) {
        params.set('count', String(count));
      }
      const qs = params.toString();
      const { ballots } = await hubGet<{ ballots: unknown[] }>(
        `/api/proposal/${id}/te_sgp_ballots${qs ? `?${qs}` : ''}`
      );
      res.json({ ballots });
    })
  );

  for (const { path, reason } of UNSUPPORTED) {
    app.post(path, (req, res) => fail(res, 501, reason));
  }

  reads.get(
    '/elections/:eid/aggregate',
    handle(async (req, res) => {
      const id = toProposalId(electionIdParam(req));
      // `null` until a quorum of keypers submits the same artifact; the
      // coordinator relies on that to keep asking, so never answer 501. Passed
      // through as text so its exact integer weights are not parsed as doubles.
      res
        .type('application/json')
        .send(await hubGetRaw(`/api/proposal/${id}/te_sgp_aggregate`));
    })
  );

  /**
   * Shares and result reads. An absent artifact must come back as empty, never
   * 501: the coordinator derives election state from these answers (for example,
   * "no result yet" means still tallying), and a 501 makes it abandon every
   * election.
   */
  reads.get(
    '/elections/:eid/shares',
    handle(async (req, res) => {
      const id = toProposalId(electionIdParam(req));
      const { shares } = await hubGet<{ shares: unknown[] }>(
        `/api/proposal/${id}/te_sgp_decryption_shares`
      );
      res.json({ shares });
    })
  );

  reads.get(
    '/elections/:eid/result',
    handle(async (req, res) => {
      const id = toProposalId(electionIdParam(req));
      // Passed through as text so the exact decimals are not parsed as doubles.
      res
        .type('application/json')
        .send(await hubGetRaw(`/api/proposal/${id}/te_result`));
    })
  );

  // Mounted after every read is declared.
  app.use(reads);
  app.use(PORT_READ_PREFIX, reads);

  app.use((req, res) =>
    fail(res, 404, `no route for ${req.method} ${req.path}`)
  );

  return app;
}
