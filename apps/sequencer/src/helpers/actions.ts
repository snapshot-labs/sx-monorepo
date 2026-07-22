import snapshot from '@snapshot-labs/snapshot.js';
import db from './mysql';
import { DEFAULT_NETWORK_ID, jsonParse, NETWORK_ID_WHITELIST } from './utils';

function normalizeSettings(settings: any) {
  const _settings = snapshot.utils.clone(settings);

  if (_settings.domain) {
    _settings.domain = _settings.domain
      ?.replace(/(^\w+:|^)\/\//, '')
      .replace(/\/$/, '');
  }
  if (_settings.delegationPortal) {
    _settings.delegationPortal = {
      delegationNetwork: '1',
      ..._settings.delegationPortal
    };
  }

  delete _settings.skinSettings;

  return _settings;
}

export async function addOrUpdateSpace(id: string, settings: any) {
  if (!settings?.name) return false;

  const normalizedSettings = normalizeSettings(settings);

  const ts = (Date.now() / 1e3).toFixed();
  const query =
    'INSERT INTO spaces SET ? ON DUPLICATE KEY UPDATE updated = ?, settings = ?, name = ?, hibernated = 0, domain = ?';

  await db.queryAsync(query, [
    {
      id,
      name: settings.name,
      created: ts,
      updated: ts,
      settings: JSON.stringify(normalizedSettings),
      domain: normalizedSettings.domain || null
    },
    ts,
    JSON.stringify(normalizedSettings),
    settings.name,
    normalizedSettings.domain || null
  ]);

  await addOrUpdateSkin(id, settings.skinSettings);
}

export async function addOrUpdateSkin(
  id: string,
  skinSettings: Record<string, string>
) {
  if (!skinSettings) return false;

  const COLORS = [
    'bg_color',
    'link_color',
    'text_color',
    'content_color',
    'border_color',
    'heading_color',
    'primary_color',
    'header_color'
  ];

  await db.queryAsync(
    `INSERT INTO skins
      SET ?
      ON DUPLICATE KEY UPDATE
        ${COLORS.map(color => `${color} = ?`).join(',')},
        theme = COALESCE(VALUES(theme), ?),
        logo = ?
    `,
    [
      {
        id,
        ...skinSettings
      },
      ...COLORS.map(color => skinSettings[color]),
      skinSettings.theme,
      skinSettings.logo
    ]
  );
}

export async function getProposal(space, id) {
  const query = `SELECT * FROM proposals WHERE space = ? AND id = ?`;
  const [proposal] = await db.queryAsync(query, [space, id]);
  if (!proposal) return false;

  proposal.strategies = jsonParse(proposal.strategies);
  proposal.validation = jsonParse(proposal.validation, {
    name: 'any',
    params: {}
  }) || {
    name: 'any',
    params: {}
  };
  proposal.choices = jsonParse(proposal.choices);
  proposal.vp_value_by_strategy = jsonParse(proposal.vp_value_by_strategy, []);

  // Threshold-ElGamal columns. Always present (NULL on non-private proposals).
  proposal.te_config = jsonParse(proposal.te_config, null);
  if (proposal.te_mpk && Buffer.isBuffer(proposal.te_mpk)) {
    proposal.te_mpk = `0x${proposal.te_mpk.toString('hex')}`;
  }

  return proposal;
}

export async function getSpace(
  id: string,
  includeDeleted = false,
  network = DEFAULT_NETWORK_ID
) {
  if (
    NETWORK_ID_WHITELIST.includes(network) &&
    network !== DEFAULT_NETWORK_ID
  ) {
    const spaceExist = await sxSpaceExists(network, id);
    if (!spaceExist) return false;

    return {
      network: 0
    };
  }

  const query = `SELECT settings, domain, deleted, flagged, verified, turbo_expiration, hibernated FROM spaces WHERE id = ? AND deleted in (?) LIMIT 1`;
  const spaces = await db.queryAsync(query, [
    id.toLowerCase(),
    includeDeleted ? [0, 1] : [0]
  ]);

  if (!spaces[0]) return false;

  return {
    ...jsonParse(spaces[0].settings, {}),
    domain: spaces[0].domain || undefined,
    deleted: spaces[0].deleted === 1,
    verified: spaces[0].verified === 1,
    flagged: spaces[0].flagged === 1,
    hibernated: spaces[0].hibernated === 1,
    turbo: spaces[0].turbo_expiration > Date.now() / 1e3
  };
}

export async function sxSpaceExists(
  network: string,
  spaceId: string
): Promise<boolean> {
  const testnetNetworks = ['sn-sep', 'sep', 'curtis'];

  const apiUrl = testnetNetworks.includes(network)
    ? 'https://testnet-api.snapshot.box'
    : 'https://api.snapshot.box';

  try {
    const { space } = await snapshot.utils.subgraphRequest(apiUrl, {
      space: {
        __args: {
          indexer: network,
          id: spaceId
        },
        id: true
      }
    });

    return !!space?.id;
  } catch {
    return false;
  }
}

export async function getPremiumNetworkIds(): Promise<string[]> {
  const premiumNetworks = await db.queryAsync(
    'SELECT id FROM networks where premium = 1'
  );
  return premiumNetworks.map(network => network.id);
}
