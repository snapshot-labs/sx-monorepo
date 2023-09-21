import { AsyncMySqlPool } from '@snapshot-labs/checkpoint';
import { dropIpfs, getJSON, getSpaceName } from './utils';

export async function handleSpaceMetadata(
  space: string,
  metadataUri: string,
  mysql: AsyncMySqlPool
) {
  const metadataItem = {
    id: dropIpfs(metadataUri),
    name: getSpaceName(space),
    about: '',
    avatar: '',
    cover: '',
    external_url: '',
    delegation_api_type: '',
    delegation_api_url: '',
    delegation_contract: '',
    github: '',
    twitter: '',
    discord: '',
    voting_power_symbol: '',
    wallet: '',
    executors: JSON.stringify([]),
    executors_types: JSON.stringify([])
  };

  const metadata: any = metadataUri ? await getJSON(metadataUri) : {};

  if (metadata.name) metadataItem.name = metadata.name;
  if (metadata.description) metadataItem.about = metadata.description;
  if (metadata.avatar) metadataItem.avatar = metadata.avatar;
  if (metadata.external_url) metadataItem.external_url = metadata.external_url;

  if (metadata.properties) {
    if (metadata.properties.cover) metadataItem.cover = metadata.properties.cover;
    if (
      metadata.properties.delegation_api_type === 'governor-subgraph' &&
      metadata.properties.delegation_api_url
    ) {
      metadataItem.delegation_api_type = metadata.properties.delegation_api_type;
      metadataItem.delegation_api_url = metadata.properties.delegation_api_url;
    }

    if (metadata.properties.delegation_contract) {
      metadataItem.delegation_contract = metadata.properties.delegation_contract;
    }

    if (metadata.properties.github) metadataItem.github = metadata.properties.github;
    if (metadata.properties.twitter) metadataItem.twitter = metadata.properties.twitter;
    if (metadata.properties.discord) metadataItem.discord = metadata.properties.discord;
    if (metadata.properties.voting_power_symbol) {
      metadataItem.voting_power_symbol = metadata.properties.voting_power_symbol;
    }
    if (metadata.properties.wallets && metadata.properties.wallets.length > 0) {
      metadataItem.wallet = metadata.properties.wallets[0];
    }
    if (
      metadata.properties.execution_strategies &&
      metadata.properties.execution_strategies_types
    ) {
      metadataItem.executors = JSON.stringify(metadata.properties.execution_strategies);
      metadataItem.executors_types = JSON.stringify(metadata.properties.execution_strategies_types);
    }
  }

  const query = `INSERT IGNORE INTO spacemetadataitems SET ?;`;
  await mysql.queryAsync(query, [metadataItem]);
}

export async function handleProposalMetadata(metadataUri: string, mysql: AsyncMySqlPool) {
  const metadataItem = {
    id: dropIpfs(metadataUri),
    title: '',
    body: '',
    discussion: '',
    execution: ''
  };

  const metadata: any = await getJSON(metadataUri);
  if (metadata.title) metadataItem.title = metadata.title;
  if (metadata.body) metadataItem.body = metadata.body;
  if (metadata.discussion) metadataItem.discussion = metadata.discussion;
  if (metadata.execution) metadataItem.execution = JSON.stringify(metadata.execution);

  const query = `INSERT IGNORE INTO proposalmetadataitems SET ?;`;
  await mysql.queryAsync(query, [metadataItem]);
}

export async function handleStrategiesParsedMetadata(metadataUri: string, mysql: AsyncMySqlPool) {
  const metadataItem = {
    id: dropIpfs(metadataUri),
    name: '',
    description: '',
    decimals: 0,
    symbol: '',
    token: null
  };

  const metadata: any = await getJSON(metadataUri);
  if (metadata.name) metadataItem.name = metadata.name;
  if (metadata.description) metadataItem.description = metadata.description;

  if (metadata.properties) {
    if (metadata.properties.decimals) metadataItem.decimals = metadata.properties.decimals;
    if (metadata.properties.symbol) metadataItem.symbol = metadata.properties.symbol;
    if (metadata.properties.token) metadataItem.token = metadata.properties.token;
  }

  const query = `INSERT IGNORE INTO strategiesparsedmetadatadataitems SET ?;`;
  await mysql.queryAsync(query, [metadataItem]);
}
