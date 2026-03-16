import { Contract } from '@ethersproject/contracts';
import { JsonRpcProvider } from '@ethersproject/providers';
import type { Web3Provider } from '@ethersproject/providers';
import type { Proposal } from '@/types';

const SNACK_FACTORY_ABI = [
  'function getMarket(string referenceUri) view returns (address)',
  'function createAndBuy(string referenceUri, uint8 outcome, uint256 usdcAmount) returns (address)',
  'function createMarket(string referenceUri) returns (address)',
  'function usdc() view returns (address)'
];

const SNACK_MARKET_ABI = [
  'function supplyYes() view returns (uint256)',
  'function supplyNo() view returns (uint256)',
  'function reserve() view returns (uint256)',
  'function resolved() view returns (bool)',
  'function winningOutcome() view returns (uint8)',
  'function getPrices() view returns (uint256 yesProb, uint256 noProb)',
  'function previewBuy(uint8 outcome, uint256 usdcAmount) view returns (uint256)',
  'function previewSell(uint8 outcome, uint256 tokenAmount) view returns (uint256)',
  'function buyOutcome(uint8 outcome, uint256 usdcAmount)',
  'function sellOutcome(uint8 outcome, uint256 tokenAmount)',
  'function redeem()',
  'function balanceOf(address account, uint256 id) view returns (uint256)',
  'function usdc() view returns (address)'
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)'
];

export const SNACK_FACTORY_ADDRESS =
  import.meta.env.VITE_SNACK_FACTORY_ADDRESS ?? '';
export const SNACK_RPC_URL =
  import.meta.env.VITE_SNACK_RPC_URL ?? 'http://127.0.0.1:8546';
export const SNACK_ENABLED = import.meta.env.VITE_SNACK_ENABLED === 'true';
export const SNACK_CHAIN_ID = 13370;

// Dedicated read-only provider that always points to Anvil
let _readProvider: JsonRpcProvider | null = null;
export function getReadProvider(): JsonRpcProvider {
  if (!_readProvider) {
    _readProvider = new JsonRpcProvider(SNACK_RPC_URL);
  }
  return _readProvider;
}

export function buildReferenceUri(proposal: Proposal): string {
  return `snapshot://${proposal.network}:${proposal.space.id}/proposal/${proposal.proposal_id}`;
}

// Read-only contracts use the dedicated Anvil provider
export function getFactoryReadonly() {
  return new Contract(SNACK_FACTORY_ADDRESS, SNACK_FACTORY_ABI, getReadProvider());
}

export function getMarketReadonly(address: string) {
  return new Contract(address, SNACK_MARKET_ABI, getReadProvider());
}

export function getErc20Readonly(address: string) {
  return new Contract(address, ERC20_ABI, getReadProvider());
}

// Write contracts use the wallet's signer (must be on Anvil chain)
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

export function getErc20Contract(address: string, provider: Web3Provider) {
  return new Contract(address, ERC20_ABI, provider.getSigner());
}

// Switch the wallet to the Anvil chain
export async function ensureAnvilChain(provider: Web3Provider): Promise<void> {
  const network = await provider.getNetwork();
  if (network.chainId === SNACK_CHAIN_ID) return;

  try {
    await provider.send('wallet_switchEthereumChain', [
      { chainId: '0x' + SNACK_CHAIN_ID.toString(16) }
    ]);
  } catch (switchError: any) {
    // Chain not added yet — add it
    if (switchError.code === 4902) {
      await provider.send('wallet_addEthereumChain', [
        {
          chainId: '0x' + SNACK_CHAIN_ID.toString(16),
          chainName: 'Snack (Anvil)',
          nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
          rpcUrls: [SNACK_RPC_URL]
        }
      ]);
    } else {
      throw switchError;
    }
  }
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

export function formatProb(prob: bigint): string {
  return ((Number(prob) / 1e18) * 100).toFixed(1);
}

export function formatUsdc(amount: bigint): string {
  return (Number(amount) / 1e6).toFixed(2);
}

export function parseUsdc(amount: string): bigint {
  return BigInt(Math.floor(Number(amount) * 1e6));
}

/**
 * Wait for a transaction to be mined using the Anvil read provider.
 * Wallet providers can hang on tx.wait() after chain switching,
 * so we poll Anvil directly instead.
 */
export async function waitForTx(txHash: string): Promise<void> {
  // Raw fetch to avoid all ethers v5 provider caching issues
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
    console.log('[snack] waitForTx poll', i, json.result ? 'found' : 'pending');
    if (json.result) return;
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error('Transaction not mined after 30s');
}

/**
 * Estimate payout if user's chosen outcome wins.
 * Uses the bonding curve: reserve = sqrt(supplyYes² + supplyNo²)
 * Returns { tokens, payout, profit } in USDC base units (6 decimals).
 */
export function estimatePayout(
  supplyYes: bigint,
  supplyNo: bigint,
  reserve: bigint,
  outcome: number,
  usdcAmount: bigint
): { tokens: number; payout: number; profit: number } {
  const yes = Number(supplyYes);
  const no = Number(supplyNo);
  const res = Number(reserve);
  const amount = Number(usdcAmount);

  if (amount <= 0) return { tokens: 0, payout: 0, profit: 0 };

  const newReserve = res + amount;
  const otherSupply = outcome === 0 ? no : yes;
  const currentSupply = outcome === 0 ? yes : no;

  const newSupply = Math.sqrt(newReserve * newReserve - otherSupply * otherSupply);
  const tokens = newSupply - currentSupply;

  if (newSupply <= 0) return { tokens: 0, payout: 0, profit: 0 };

  // If this outcome wins, user gets (their tokens / total winning supply) * total reserve
  const payout = (tokens / newSupply) * newReserve;
  const profit = payout - amount;

  return { tokens, payout, profit };
}

/**
 * Estimate USDC returned when selling tokens.
 * newReserve = sqrt(newSupplyYes² + newSupplyNo²)
 * usdcReturned = reserve - newReserve
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
