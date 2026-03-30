import { Contract } from '@ethersproject/contracts';
import { StaticJsonRpcProvider, Web3Provider } from '@ethersproject/providers';
import { Proposal } from '@/types';

const SNACK_FACTORY_ABI = [
  'function getMarket(string referenceUri) view returns (address)',
  'function createAndBuy(string referenceUri, uint8 outcome) payable returns (address)',
  'function createMarket(string referenceUri) returns (address)'
];

const SNACK_MARKET_ABI = [
  'function supplyYes() view returns (uint256)',
  'function supplyNo() view returns (uint256)',
  'function reserve() view returns (uint256)',
  'function resolved() view returns (bool)',
  'function winningOutcome() view returns (uint8)',
  'function getPrices() view returns (uint256 yesProb, uint256 noProb)',
  'function previewBuy(uint8 outcome, uint256 ethAmount) view returns (uint256)',
  'function previewSell(uint8 outcome, uint256 tokenAmount) view returns (uint256)',
  'function buyOutcome(uint8 outcome) payable',
  'function sellOutcome(uint8 outcome, uint256 tokenAmount)',
  'function redeem()',
  'function balanceOf(address account, uint256 id) view returns (uint256)'
];

export const SNACK_FACTORY_ADDRESS =
  import.meta.env.VITE_SNACK_FACTORY_ADDRESS ?? '';
export const SNACK_RPC_URL =
  import.meta.env.VITE_SNACK_RPC_URL ?? 'https://rpc.snapshot.org/11155111';
export const SNACK_ENABLED = import.meta.env.VITE_SNACK_ENABLED === 'true';
export const SNACK_CHAIN_ID = 11155111;

// Dedicated read-only provider for the snack chain
let _readProvider: StaticJsonRpcProvider | null = null;
export function getReadProvider(): StaticJsonRpcProvider {
  if (!_readProvider) {
    _readProvider = new StaticJsonRpcProvider(
      { url: SNACK_RPC_URL, timeout: 25000 },
      SNACK_CHAIN_ID
    );
  }
  return _readProvider;
}

export function buildReferenceUri(proposal: Proposal): string {
  return `snapshot://${proposal.network}:${proposal.space.id}/proposal/${proposal.proposal_id}`;
}

// Read-only contracts use the dedicated snack provider
export function getFactoryReadonly() {
  return new Contract(
    SNACK_FACTORY_ADDRESS,
    SNACK_FACTORY_ABI,
    getReadProvider()
  );
}

export function getMarketReadonly(address: string) {
  return new Contract(address, SNACK_MARKET_ABI, getReadProvider());
}

// Write contracts use the wallet's signer
export function getFactoryContract(provider: Web3Provider) {
  return new Contract(
    SNACK_FACTORY_ADDRESS,
    SNACK_FACTORY_ABI,
    provider.getSigner()
  );
}

export function getMarketContract(address: string, provider: Web3Provider) {
  return new Contract(address, SNACK_MARKET_ABI, provider.getSigner());
}


export interface MarketState {
  address: string;
  supplyYes: bigint;
  supplyNo: bigint;
  reserve: bigint;
  resolved: boolean;
  winningOutcome: number;
  yesProb: bigint;
  noProb: bigint;
}

export async function fetchMarketState(
  marketAddress: string
): Promise<MarketState> {
  const market = getMarketReadonly(marketAddress);

  const [supplyYes, supplyNo, reserve, resolved, winningOutcome, prices] =
    await Promise.all([
      market.supplyYes(),
      market.supplyNo(),
      market.reserve(),
      market.resolved(),
      market.winningOutcome(),
      market.getPrices()
    ]);

  return {
    address: marketAddress,
    supplyYes: supplyYes.toBigInt(),
    supplyNo: supplyNo.toBigInt(),
    reserve: reserve.toBigInt(),
    resolved,
    winningOutcome,
    yesProb: prices.yesProb.toBigInt(),
    noProb: prices.noProb.toBigInt()
  };
}

export function formatCents(prob: bigint): number {
  return Math.round(Number(prob) / 1e16);
}

export function computeChance(
  supplyYes: bigint,
  supplyNo: bigint,
  reserve: bigint,
  outcome: number,
  delta: number,
  isSell: boolean
): { yes: number; no: number } | null {
  if (delta <= 0) return null;

  const yes = Number(supplyYes);
  const no = Number(supplyNo);

  let newYes: number, newNo: number;

  if (isSell) {
    newYes = outcome === 0 ? yes - delta : yes;
    newNo = outcome === 1 ? no - delta : no;
    if (newYes < 0 || newNo < 0) return null;
  } else {
    const res = Number(reserve);
    const newReserve = res + delta;
    const other = outcome === 0 ? no : yes;
    const newChosen = Math.sqrt(newReserve * newReserve - other * other);
    newYes = outcome === 0 ? newChosen : yes;
    newNo = outcome === 1 ? newChosen : no;
  }

  const total = newYes * newYes + newNo * newNo;
  if (total === 0) return null;

  return {
    yes: Math.round((newYes / Math.sqrt(total)) * 100),
    no: Math.round((newNo / Math.sqrt(total)) * 100)
  };
}

export function formatEth(amount: bigint): string {
  const val = Number(amount) / 1e18;
  if (val === 0) return '0';
  // Up to 6 decimals, but strip trailing zeros
  return parseFloat(val.toFixed(6)).toString();
}

export function parseEth(amount: string): bigint {
  const num = Number(amount);
  if (!isFinite(num) || num < 0) return 0n;
  // Use string manipulation to avoid floating point precision issues
  return BigInt(Math.floor(num * 1e18));
}

/** Wait for a transaction to be mined by polling the snack RPC directly. */
export async function waitForTx(txHash: string): Promise<void> {
  for (let i = 0; i < 60; i++) {
    const res = await fetch(SNACK_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_getTransactionReceipt',
        params: [txHash]
      })
    });
    const json = await res.json();
    if (json.result) return;
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error('Transaction not mined after 30s');
}

/**
 * Estimate payout if user's chosen outcome wins.
 * Uses the bonding curve: reserve = sqrt(supplyYes² + supplyNo²)
 * Returns { tokens, payout, profit } in wei (18 decimals).
 */
export function estimatePayout(
  supplyYes: bigint,
  supplyNo: bigint,
  reserve: bigint,
  outcome: number,
  ethAmount: bigint
): { tokens: number; payout: number; profit: number } {
  const yes = Number(supplyYes);
  const no = Number(supplyNo);
  const res = Number(reserve);
  const amount = Number(ethAmount);

  if (amount <= 0) return { tokens: 0, payout: 0, profit: 0 };

  const newReserve = res + amount;
  const otherSupply = outcome === 0 ? no : yes;
  const currentSupply = outcome === 0 ? yes : no;

  const newSupply = Math.sqrt(
    newReserve * newReserve - otherSupply * otherSupply
  );
  const tokens = newSupply - currentSupply;

  if (newSupply <= 0) return { tokens: 0, payout: 0, profit: 0 };

  const payout = (tokens / newSupply) * newReserve;
  const profit = payout - amount;

  return { tokens, payout, profit };
}

/**
 * Estimate ETH returned when selling tokens.
 * newReserve = sqrt(newSupplyYes² + newSupplyNo²)
 * ethReturned = reserve - newReserve
 */
export function estimateSell(
  supplyYes: bigint,
  supplyNo: bigint,
  reserve: bigint,
  outcome: number,
  tokenAmount: bigint
): number {
  const yes = Number(supplyYes);
  const no = Number(supplyNo);
  const res = Number(reserve);
  const amount = Number(tokenAmount);

  if (amount <= 0) return 0;

  const newYes = outcome === 0 ? yes - amount : yes;
  const newNo = outcome === 1 ? no - amount : no;

  if (newYes < 0 || newNo < 0) return 0;

  const newReserve = Math.sqrt(newYes * newYes + newNo * newNo);
  return res - newReserve;
}
