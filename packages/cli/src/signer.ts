import { Wallet } from '@ethersproject/wallet';
import { gql } from './hub.js';

export async function getSigner(): Promise<{ signer: Wallet; user: string }> {
  const key = process.env.ALIAS_PRIVATE_KEY;
  if (key === undefined || key === '') {
    throw new Error(
      'ALIAS_PRIVATE_KEY is not set. Generate a key (`openssl rand -hex 32`), then visit ' +
        'https://snapshot.box/#/settings/alias/authorize/<alias-address> to authorize it.'
    );
  }
  const signer = new Wallet(key);
  const alias = await signer.getAddress();
  const { aliases } = await gql<{ aliases: { address: string }[] }>(
    'query ($where: AliasWhere) { aliases(first: 1, skip: 0, where: $where) { address } }',
    { where: { alias } }
  );
  if (aliases.length === 0) {
    throw new Error(
      `Alias ${alias} is not authorized. Visit https://snapshot.box/#/settings/alias/authorize/${alias} to authorize it.`
    );
  }
  return { signer, user: aliases[0].address };
}
