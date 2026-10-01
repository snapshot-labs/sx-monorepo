/**
 * Teach snapshot.js' bundled JSON schemas about the permanent-private
 * ``shutter-elgamal`` privacy value.
 *
 * The published ``@snapshot-labs/snapshot.js`` space / proposal schemas only
 * allow ``''`` and ``'shutter'`` (and ``'any'`` for spaces) in their
 * ``privacy`` enums. This sequencer adds a third privacy mode,
 * ``shutter-elgamal`` (threshold-ElGamal permanent private voting), which the
 * writer pipeline (``writer/proposal.ts``, ``writer/vote.ts``, ``scores.ts``)
 * already understands. Without this patch, ``validateSchema`` rejects any
 * wallet-signed proposal that opts into permanent privacy with
 * "wrong proposal format".
 *
 * ``snapshot.utils.validateSchema`` calls ``ajv.compile(schema)`` afresh on
 * every invocation, so mutating the in-memory schema objects once at startup
 * is sufficient and recompiles pick up the extended enum. This is idempotent.
 */
import snapshot from '@snapshot-labs/snapshot.js';

const PRIVACY_VALUE = 'shutter-elgamal';

function extendPrivacyEnums(node: any): void {
  if (!node || typeof node !== 'object') return;

  const privacy = node.properties?.privacy;
  if (
    privacy &&
    Array.isArray(privacy.enum) &&
    privacy.enum.includes('shutter') &&
    !privacy.enum.includes(PRIVACY_VALUE)
  ) {
    privacy.enum.push(PRIVACY_VALUE);
  }

  for (const key of Object.keys(node)) {
    extendPrivacyEnums(node[key]);
  }
}

export function patchPrivacySchemas(): void {
  const schemas: any = (snapshot as any).schemas;
  if (!schemas) return;

  for (const name of ['space', 'proposal', 'updateProposal']) {
    if (schemas[name]) extendPrivacyEnums(schemas[name]);
  }
}
