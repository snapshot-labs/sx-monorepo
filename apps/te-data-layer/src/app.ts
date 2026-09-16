/**
 * The data-layer contract, served over Snapshot's hub.
 *
 * The keypers and their coordinator come from a separate codebase and speak one
 * fixed HTTP contract. This service implements that contract exactly — same paths,
 * same request and response bodies, same status semantics — so that side needs no
 * modification at all: it is pointed here by configuration and nothing else.
 *
 * Two properties are deliberate and load-bearing:
 *
 *   **Stateless and keyless.** No database handle, no signing key, no cache of
 *   record. Everything comes from the hub, which is the sole store. That is what
 *   makes it safe to run several replicas behind a load balancer, and it means a
 *   compromise here cannot forge an artifact — only withhold one.
 *
 *   **A translator, not an authority.** It maps shapes and forwards status. Where
 *   the protocol expects a write Snapshot has no equivalent for, it answers 501
 *   rather than inventing behaviour — see the four routes at the bottom.
 *
 * Each route below carries the reasoning for its own mapping, including the two
 * that deliberately answer something other than what the caller asked for.
 */

import cors from 'cors';
import express, { Express, Request, Response, Router } from 'express';
import { BadElectionId, toProposalId } from './eid';
import { HubError, hubGet, hubGetRaw, hubPost, hubPostRaw } from './hub';
import log from './log';

/**
 * Where the read surface is mounted a second time, for the keypers.
 *
 * The protocol splits its two audiences by path. The coordinator gets the root
 * surface — it reads *and* writes, being the sole writer to the data layer, since
 * keypers relay their signed submissions through it. The keypers get a read-only
 * mount, and they build its URL themselves: they are configured with a base URL and
 * append this prefix (`services/keyper` → `resolve_read_url`), which is the same
 * prefix the protocol's own `api` service uses. So the constant is theirs, not ours,
 * and must not be renamed.
 *
 * Mounting reads here rather than pointing keypers at the root is what keeps that
 * split real: a keyper cannot reach a write route at the surface it reads from.
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
 * Run a handler, turning the two expected failure kinds into their statuses.
 *
 * A bad election id is the caller's error (400); a hub failure carries the status
 * the hub chose. Anything else is a genuine bug here and becomes a 500 — never
 * silently a 404, which would read to the coordinator as "this election does not
 * exist" and make it give up on a healthy proposal.
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
        // Kept for the one payload whose numbers must not pass through a
        // double: see the result routes below.
        req.rawBody = buf.toString('utf8');
      }
    })
  );
  // Reads are public by design: the protocol treats its data layer as trusted for
  // availability only, and every artifact it serves is independently verifiable.
  app.use(cors({ maxAge: 86400 }));
  app.use(accessLog);

  app.get('/health', (req, res) => {
    res.json({ ok: true, uptimeS: Math.round(process.uptime()) });
  });

  // Every read lives on this router, which is mounted twice: at the root for the
  // coordinator, and under /port for the keypers. One definition, so the two
  // audiences can never be served different answers.
  const reads = Router();

  /**
   * Verifiability tier. Zero means the data layer offers availability only — it
   * can withhold or reorder, but every artifact is self-verifying, so it cannot
   * forge one. That is an accurate description of a Snapshot-backed deployment.
   */
  reads.get('/capability', (req, res) => {
    res.json({ verifiabilityTier: 0 });
  });

  reads.get(
    '/elections',
    handle(async (req, res) => {
      const { electionIds } = await hubGet<{ electionIds: string[] }>(
        '/api/te_geg_elections'
      );
      // Ids pass through unchanged, and the reason is worth stating because the
      // contract is asymmetric: *path segments* carry bare hex, but every byte
      // field in a JSON body is `0x`-prefixed. Stripping the prefix here — the
      // obvious-looking move, given the paths — makes the client reject the whole
      // list with "missing '0x' prefix", and the coordinator then sees no elections
      // at all rather than an error it can attribute.
      res.json({ electionIds });
    })
  );

  reads.get(
    '/elections/:eid',
    handle(async (req, res) => {
      const id = toProposalId(electionIdParam(req));
      res.json(
        await hubGet<Record<string, unknown>>(
          `/api/proposal/${id}/te_geg_election`
        )
      );
    })
  );

  app.post(
    '/elections/:eid/dkg',
    handle(async (req, res) => {
      const id = toProposalId(electionIdParam(req));
      // Forwarded verbatim. The keyper index is deliberately absent from this
      // payload — the hub recovers it from the signature, so a submission can only
      // ever count for whoever actually signed it.
      await hubPost(`/api/proposal/${id}/te_geg_dkg`, {
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
      // Forwarded verbatim, keyper index included in neither: the hub recovers
      // it from the signature over the whole artifact, so a submission can only
      // ever count for whoever actually derived it.
      await hubPost(`/api/proposal/${id}/te_aggregate`, {
        aggregate: req.body?.aggregate,
        keyperSig: req.body?.keyperSig
      });
      res.status(204).end();
    })
  );

  app.post(
    '/elections/:eid/shares',
    handle(async (req, res) => {
      const id = toProposalId(electionIdParam(req));
      await hubPost(`/api/proposal/${id}/te_geg_decryption_share`, {
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
      // Forwarded as raw text rather than re-serialised: a published tally's
      // totals can exceed what a JSON number carries exactly, and they are what
      // the publisher's signature covers. Re-encoding them through a double
      // would round them and the signature would stop verifying.
      await hubPostRaw(`/api/proposal/${id}/te_result`, (req as any).rawBody);
      res.status(204).end();
    })
  );

  app.post(
    '/elections/:eid/tally-stalled',
    handle(async (req, res) => {
      const id = toProposalId(electionIdParam(req));
      // One route, two authorities: the hub decides which key may sign which
      // direction, so both signature fields are forwarded and neither is
      // interpreted here.
      await hubPost(`/api/proposal/${id}/te_tally_stalled`, {
        stalled: req.body?.stalled,
        issuedAt: req.body?.issuedAt,
        resultPublisherSig: req.body?.resultPublisherSig,
        adminSig: req.body?.adminSig
      });
      res.status(204).end();
    })
  );

  reads.get(
    '/elections/:eid/dkg',
    handle(async (req, res) => {
      const id = toProposalId(electionIdParam(req));
      const { submissions } = await hubGet<{ submissions: unknown[] }>(
        `/api/proposal/${id}/te_geg_dkg`
      );
      res.json({ submissions });
    })
  );

  reads.get(
    '/elections/:eid/dkg/finalized',
    handle(async (req, res) => {
      const id = toProposalId(electionIdParam(req));
      // Derived from the same read as the election itself: a finalized key exists
      // exactly when the committee reached its quorum.
      const { finalizedKey } = await hubGet<{ finalizedKey: unknown }>(
        `/api/proposal/${id}/te_geg_election`
      );
      res.json({ finalizedKey: finalizedKey ?? null });
    })
  );

  reads.get(
    '/elections/:eid/ballots/count',
    handle(async (req, res) => {
      const id = toProposalId(electionIdParam(req));
      const { count } = await hubGet<{ count: number }>(
        `/api/proposal/${id}/te_geg_ballots?countOnly=1`
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
      if (Number.isFinite(start) && start > 0)
        params.set('start', String(start));
      if (Number.isFinite(count) && count > 0)
        params.set('count', String(count));
      const qs = params.toString();
      const { ballots } = await hubGet<{ ballots: unknown[] }>(
        `/api/proposal/${id}/te_geg_ballots${qs ? `?${qs}` : ''}`
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
      // `null` until a quorum of keypers submits the same artifact. That absence
      // is a fact the coordinator acts on — it is how it knows to keep asking the
      // committee to derive — so it must be reported, never 501'd.
      const { aggregate } = await hubGet<{ aggregate: unknown }>(
        `/api/proposal/${id}/te_geg_aggregate`
      );
      res.json({ aggregate: aggregate ?? null });
    })
  );

  /**
   * Reads for artifacts that have no storage yet, answered as genuinely absent.
   *
   * These must **not** be 501. Lifecycle state is derived from the facts the data
   * layer reports, and "no result exists" is one of those facts — it is how the
   * coordinator distinguishes an election still mid-tally from one already
   * complete. A 501 here is not a cautious answer, it is an unanswerable one: the
   * coordinator cannot derive state at all and abandons every election, including
   * the ones it should be driving.
   */
  reads.get(
    '/elections/:eid/shares',
    handle(async (req, res) => {
      const id = toProposalId(electionIdParam(req));
      const { shares } = await hubGet<{ shares: unknown[] }>(
        `/api/proposal/${id}/te_geg_decryption_shares`
      );
      res.json({ shares });
    })
  );

  reads.get(
    '/elections/:eid/result',
    handle(async (req, res) => {
      const id = toProposalId(electionIdParam(req));
      // Passed through as text for the same reason the write is: the hub
      // composes exact decimals that must not round-trip through a double here.
      res
        .type('application/json')
        .send(await hubGetRaw(`/api/proposal/${id}/te_result`));
    })
  );

  // Mounted last, once every read is declared: at the root for the coordinator,
  // and again under /port for the keypers.
  app.use(reads);
  app.use(PORT_READ_PREFIX, reads);

  app.use((req, res) =>
    fail(res, 404, `no route for ${req.method} ${req.path}`)
  );

  return app;
}
