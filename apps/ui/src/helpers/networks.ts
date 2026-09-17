import networksJson from '@snapshot-labs/snapshot.js/src/networks.json';

export type SnapshotNetwork = (typeof networksJson)[keyof typeof networksJson];

export const networks: Record<string, SnapshotNetwork> = networksJson;
