import { keccak256 } from '@ethersproject/keccak256';
import { toUtf8Bytes } from '@ethersproject/strings';
import { BatchFile } from './types';

// JSON spec does not allow undefined so stringify removes the prop
// That's a problem for calculating the checksum back so this function avoid the issue
export const stringifyReplacer = (_: string, value: any) =>
  value === undefined ? null : value;

function serializeJSONObject(json: any): string {
  if (Array.isArray(json)) {
    return `[${json.map(el => serializeJSONObject(el)).join(',')}]`;
  }

  if (typeof json === 'object' && json !== null) {
    let acc = '';
    const keys = Object.keys(json).sort();
    acc += `{${JSON.stringify(keys, stringifyReplacer)}`;

    for (let i = 0; i < keys.length; i++) {
      acc += `${serializeJSONObject(json[keys[i]])},`;
    }

    return `${acc}}`;
  }

  return `${JSON.stringify(json, stringifyReplacer)}`;
}

export function calculateChecksum(batchFile: BatchFile): string | undefined {
  const serialized = serializeJSONObject({
    ...batchFile,
    meta: { ...batchFile.meta, name: null }
  });

  const sha = keccak256(toUtf8Bytes(serialized));

  return sha || undefined;
}

export function addChecksum(batchFile: BatchFile): BatchFile {
  return {
    ...batchFile,
    meta: {
      ...batchFile.meta,
      checksum: calculateChecksum(batchFile)
    }
  };
}

export function validateChecksum(
  batchFile: BatchFile,
  expectedChecksum?: string
): boolean {
  const targetObj = { ...batchFile };
  delete targetObj.meta.checksum;

  return (
    calculateChecksum(targetObj) ===
    (expectedChecksum || targetObj.meta.checksum)
  );
}
