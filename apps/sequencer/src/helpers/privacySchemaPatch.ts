/**
 * Adds `shutter-elgamal` to the `privacy` enums of snapshot.js' bundled space and
 * proposal schemas, which only allow `''`, `'shutter'` (and `'any'` for spaces).
 * Without it, `validateSchema` rejects private proposals as "wrong proposal format".
 *
 * `validateSchema` compiles the schema on every call, so patching the objects once
 * at startup is enough. Safe to call more than once.
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
