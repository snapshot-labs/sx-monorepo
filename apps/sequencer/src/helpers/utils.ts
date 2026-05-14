import { createHash, randomInt } from 'crypto';
import http from 'http';
import https from 'https';
import { URL } from 'url';
import { BigNumber } from '@ethersproject/bignumber';
import { capture } from '@snapshot-labs/snapshot-sentry';
import snapshot from '@snapshot-labs/snapshot.js';
import { Response } from 'express';
import fetch from 'node-fetch';

const MAINNET_NETWORK_ID_WHITELIST = [
  's',
  'eth',
  'arb1',
  'oeth',
  'sn',
  'base',
  'mnt',
  'ape'
];
const TESTNET_NETWORK_ID_WHITELIST = [
  's-tn',
  'sep',
  'curtis',
  'linea-testnet',
  'sn-sep'
];
const broviderUrl = process.env.BROVIDER_URL ?? 'https://rpc.snapshot.org';

export const NETWORK_ID_WHITELIST = [
  ...MAINNET_NETWORK_ID_WHITELIST,
  ...TESTNET_NETWORK_ID_WHITELIST
];
export const DEFAULT_NETWORK = process.env.DEFAULT_NETWORK ?? '1';
export const NETWORK = process.env.NETWORK ?? 'testnet';
export const NETWORK_IDS =
  process.env.NETWORK === 'testnet'
    ? TESTNET_NETWORK_ID_WHITELIST
    : MAINNET_NETWORK_ID_WHITELIST;
export const DEFAULT_NETWORK_ID = NETWORK_IDS[0];

export function jsonParse(input, fallback?) {
  try {
    return JSON.parse(input);
  } catch {
    return fallback || {};
  }
}

export function sendError(res: Response, description: any, status?: number) {
  const statusCode = status ?? (typeof description === 'string' ? 400 : 500);
  return res.status(statusCode).json({
    error: statusCode < 500 ? 'client_error' : 'server_error',
    error_description: description
  });
}

export function sha256(str) {
  return createHash('sha256').update(str).digest('hex');
}

export function rpcSuccess(res, result, id) {
  res.json({
    jsonrpc: '2.0',
    result,
    id
  });
}

export function rpcError(res, code, e, id) {
  res.status(code).json({
    jsonrpc: '2.0',
    error: {
      code,
      message: 'unauthorized',
      data: e
    },
    id
  });
}

export async function jsonRpcRequest(
  url: string,
  method: string,
  params: any
): Promise<any> {
  const init = {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method,
      params,
      id: randomInt(10000)
    })
  };

  try {
    const res = await fetchWithKeepAlive(url, init);

    if (!res.ok) {
      const error: any = new Error(
        `HTTP error: ${res.status} ${res.statusText}`
      );
      error.status = res.status;
      throw error;
    }

    const response = await res.json();

    if (response.error) {
      throw new Error(
        `JSON-RPC error: ${response.error.message || response.error.code || 'Unknown error'}`
      );
    }

    return response.result;
  } catch (err) {
    capture(err, {
      url,
      request: { method, params }
    });
    throw err;
  }
}

export function hasStrategyOverride(strategies: any[]) {
  const keywords = [
    '"aura-vlaura-vebal-with-overrides"',
    '"balance-of-with-linear-vesting-power"',
    '"balancer-delegation"',
    '"cyberkongz"',
    '"cyberkongz-v2"',
    '"delegation"',
    '"delegation-with-cap"',
    '"delegation-with-overrides"',
    '"erc20-balance-of-delegation"',
    '"erc20-balance-of-fixed-total"',
    '"erc20-balance-of-quadratic-delegation"',
    '"erc20-votes-with-override"',
    '"esd-delegation"',
    '"ocean-dao-brightid"',
    '"orbs-network-delegation"',
    '"api-v2-override"',
    '"rocketpool-node-operator-delegate-v8"',
    '"eden-online-override"',
    '"split-delegation"',
    '"sonic-staked-balance"'
  ];
  const strategiesStr = JSON.stringify(strategies).toLowerCase();
  if (keywords.some(keyword => strategiesStr.includes(`"name":${keyword}`)))
    return true;
  // Check for split-delegation with delegationOverride
  const splitDelegation = strategies.filter(
    strategy => strategy.name === 'split-delegation'
  );
  return (
    splitDelegation.length > 0 &&
    splitDelegation.some(strategy => strategy.params?.delegationOverride)
  );
}

export function validateChoices({ type, choices }): boolean {
  if (!type || !choices?.length) return false;
  if (type === 'basic') return choices.length === 2 || choices.length === 3;

  return true;
}

export function getIp(req) {
  const ips = (
    req.headers['cf-connecting-ip'] ||
    req.headers['x-real-ip'] ||
    req.headers['x-forwarded-for'] ||
    req.connection.remoteAddress ||
    ''
  ).split(',');

  return ips[0].trim();
}

export function verifyAuth(req, res, next) {
  const auth = req.headers.secret || '';
  const authHash = sha256(auth);
  const secretHash = process.env.AUTH_SECRET;

  if (!secretHash || authHash !== secretHash) {
    return sendError(res, 'Unauthorized', 401);
  }

  return next();
}

const agentOptions = { keepAlive: true };
const httpAgent = new http.Agent(agentOptions);
const httpsAgent = new https.Agent(agentOptions);

function agent(url: string) {
  return new URL(url).protocol === 'http:' ? httpAgent : httpsAgent;
}

export const fetchWithKeepAlive = (uri: any, options: any = {}) => {
  return fetch(uri, { agent: agent(uri), ...options });
};

export const getQuorum = async (
  options: any,
  network: string,
  blockTag: number
) => {
  const { strategy = 'static', total = 0 } = options;
  switch (strategy) {
    case 'static': {
      return total;
    }
    case 'balance': {
      const { address, methodABI, decimals, quorumModifier = 1 } = options;
      const provider = snapshot.utils.getProvider(network, { broviderUrl });

      const votingPower = await snapshot.utils.call(
        provider,
        [methodABI],
        [address, methodABI.name],
        {
          blockTag
        }
      );

      return (
        BigNumber.from(votingPower)
          .div(BigNumber.from(10).pow(decimals))
          .toNumber() * quorumModifier
      );
    }

    case 'multichainBalance': {
      const { network, strategies, quorumModifier = 1 } = options;
      const provider = snapshot.utils.getProvider(network, { broviderUrl });
      const blocks = await snapshot.utils.getSnapshots(
        network,
        blockTag,
        provider,
        strategies.map(s => s.network || network)
      );
      const requests: Promise<any>[] = strategies.map(s =>
        snapshot.utils.call(
          snapshot.utils.getProvider(s.network, { broviderUrl }),
          [s.methodABI],
          [s.address, s.methodABI.name],
          {
            blockTag: blocks[s.network]
          }
        )
      );
      const results = await Promise.all(requests);
      const totalBalance = results.reduce((total, ele, index) => {
        if (index === 1) {
          total = total.div(BigNumber.from(10).pow(strategies[0].decimals));
        }
        return total.add(
          ele.div(BigNumber.from(10).pow(strategies[index].decimals))
        );
      });
      return totalBalance.toNumber() * quorumModifier;
    }

    default:
      throw new Error(`Unsupported quorum strategy: ${strategy}`);
  }
};

export function captureError(
  e: any,
  context?: any,
  ignoredErrorCodes?: number[]
) {
  if (ignoredErrorCodes?.includes(e.code)) return;

  capture(e, context);
}

export async function clearStampCache(type: string, id: string) {
  return fetch(
    `https://cdn.stamp.fyi/clear/${type}/${type === 'avatar' ? 'eth:' : ''}${id}`
  );
}

export async function removeFromWalletConnectWhitelist(domain: string) {
  return updateWalletConnectWhitelist(domain, 'DELETE');
}

export async function addToWalletConnectWhitelist(domain: string) {
  return updateWalletConnectWhitelist(domain, 'POST');
}

async function updateWalletConnectWhitelist(
  domain: string,
  method: 'POST' | 'DELETE'
): Promise<boolean> {
  if (
    !domain ||
    !process.env.REOWN_SECRET ||
    !process.env.WALLETCONNECT_PROJECT_ID
  )
    return false;

  try {
    await fetch(`https://cloud.reown.com/api/set-allowed-domains`, {
      method,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: process.env.REOWN_SECRET
      },
      body: JSON.stringify({
        projectId: process.env.WALLETCONNECT_PROJECT_ID,
        origins: [domain]
      })
    });
  } catch (err) {
    capture(err, { domain, method });
    return false;
  }

  return true;
}

export function getSpaceController(space: string, network = NETWORK) {
  const tld = space.split('.').slice(-1)[0];
  const tldMapping = {
    shib: {
      mainnet: '109',
      testnet: '157'
    },
    sonic: {
      mainnet: '146'
    }
  };
  const networkId = tldMapping[tld]?.[network] ?? DEFAULT_NETWORK;

  return snapshot.utils.getSpaceController(space, networkId, { broviderUrl });
}
