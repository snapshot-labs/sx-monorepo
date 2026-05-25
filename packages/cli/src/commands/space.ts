import { gql } from '../hub.js';

type Space = {
  id: string;
  name: string;
  about: string | null;
  network: string;
  followersCount: number;
  proposalsCount: number;
  voting: { type: string | null; period: number | null; privacy: string | null };
};

export async function showSpace(id: string): Promise<void> {
  const { space } = await gql<{ space: Space | null }>(
    `query ($id: String!) {
      space(id: $id) {
        id name about network followersCount proposalsCount
        voting { type period privacy }
      }
    }`,
    { id }
  );
  if (space === null) throw new Error(`Space not found: ${id}`);
  console.log(JSON.stringify(space, null, 2));
}

export async function searchSpaces(query: string): Promise<void> {
  const { spaces } = await gql<{ spaces: { id: string; name: string; followersCount: number }[] }>(
    `query ($search: String) {
      spaces(first: 20, where: { search: $search }, orderBy: "followers_count", orderDirection: desc) {
        id name followersCount
      }
    }`,
    { search: query }
  );
  for (const s of spaces) {
    console.log(`${s.id}\t${s.followersCount}\t${s.name}`);
  }
}
