import { evm } from '@snapshot-labs/checkpoint';
import { capture } from '@snapshot-labs/snapshot-sentry';
import { formatUnits } from 'viem';
import { normalize } from 'viem/ens';
import SchnapsAbi from './abis/Schnaps';
import { TURBO_PRICE_USD } from './config';
import { notifyPayment } from './discord';
import tokens from './payment_tokens.json';
import { STRIPE_INDEXER } from './stripe/config';
import { getJSON } from './utils';
import { Payment, Space } from '../.checkpoint/models';

const MILLISECONDS = 1000;
const DECIMALS_COUNT = 6; // USDC and USDT both have 6 decimals
const DECIMALS = 10 ** DECIMALS_COUNT;

const TURBO_MONTHLY_PRICE = TURBO_PRICE_USD.monthly * DECIMALS;
const TURBO_YEARLY_PRICE = TURBO_PRICE_USD.yearly * DECIMALS;

const DAYS_PER_YEAR = (365 * 3 + 366) / 4; // Accounting for leap years, which happens even four year (this is technically incorrect due to leap seconds but it's good enough for this purpose)
const YEARLY_PRICE_PER_DAY = TURBO_YEARLY_PRICE / DAYS_PER_YEAR;
const YEARLY_PRICE_PER_SECOND = YEARLY_PRICE_PER_DAY / (24 * 60 * 60); // 24 hours * 60 minutes * 60 seconds

const DAYS_PER_MONTH = (365 * 3 + 366) / 48; // Accounting for leap years, which happens even four year (this is technically incorrect due to leap seconds but it's good enough for this purpose)
const MONTHLY_PRICE_PER_DAY = TURBO_MONTHLY_PRICE / DAYS_PER_MONTH;
const MONTHLY_PRICE_PER_SECOND = MONTHLY_PRICE_PER_DAY / (24 * 60 * 60); // 24 hours * 60 minutes * 60 seconds

const ADMIN_ADDRESS = (
  process.env.ADMIN_ADDRESS || '0x8C28Cf33d9Fd3D0293f963b1cd27e3FF422B425c'
).toLowerCase();

const NATIVE_TOKEN = '0x0000000000000000000000000000000000000000';
const MIN_CREDITS_WEI = 10_000_000_000_000_000n; // 0.01 ETH, one proposal
const MAX_TEXT_LENGTH = 256;
const MAX_INT32 = 2 ** 31 - 1;
const MAX_INT64 = 2n ** 63n - 1n;
const SPACE_PREFIXES: Record<string, string> = {
  eth: 's',
  base: 's',
  sep: 's-tn'
};
const CID_REGEX = /^(ipfs:\/\/)?(Qm[1-9A-HJ-NP-Za-km-z]{44}|b[a-z2-7]{58})$/;

const MIGRATED_TURBO_SPACES = {
  's:mimo.eth': 's:parallel-protocol.eth',
  's:aventus.eth': 's:aventus-gov.eth',
  's:aave.eth': 's:aavedao.eth'
};

function getTokenSymbol(tokenAddress: string, chain: string) {
  return tokens[chain]?.[tokenAddress];
}

function isText(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length <= MAX_TEXT_LENGTH &&
    !value.includes('\0')
  );
}

// Returns the space key of a `credits:<prefix>:<space id>` barcode, or null.
// Space ids follow the sequencer's rule: an already normalized ENS name.
export function parseCreditsBarcode(
  barcode: string,
  prefix: string
): string | null {
  const match = barcode.match(/^credits:([^:]+):(.+)$/);
  if (!match || match[1] !== prefix) return null;

  const id = match[2];
  try {
    return [...id].length <= 64 && normalize(id) === id
      ? `${prefix}:${id}`
      : null;
  } catch {
    return null;
  }
}

// Computes the new expiration date from a payment amount.
// Pure helper, no entity coupling — both the on-chain writer and the Stripe
// indexer call this with primitives.
// - Returns the current expiration unchanged if the amount is below one month
// - If the user has paid for more than a year, extends by the number of years paid
//   plus a per-second surplus at YEARLY_PRICE_PER_SECOND
// - Otherwise extends by the number of months paid plus a per-second surplus
//   at MONTHLY_PRICE_PER_SECOND
export function computeExpirationFromAmount(
  amountRaw: bigint,
  currentExpiration: number,
  timestamp: number
): Date {
  if (amountRaw < TURBO_MONTHLY_PRICE) {
    if (currentExpiration) {
      return new Date(currentExpiration * MILLISECONDS);
    }
    return new Date(0);
  }

  const baseTimestamp = Math.max(currentExpiration, timestamp);
  const expirationDate = new Date(baseTimestamp * MILLISECONDS);

  if (amountRaw >= TURBO_YEARLY_PRICE) {
    const years = Number(amountRaw) / TURBO_YEARLY_PRICE;
    expirationDate.setFullYear(expirationDate.getFullYear() + years);

    const surplus = Number(amountRaw) % TURBO_YEARLY_PRICE;
    const surplusSeconds = surplus / YEARLY_PRICE_PER_SECOND;
    expirationDate.setSeconds(expirationDate.getSeconds() + surplusSeconds);
  } else {
    const months = Number(amountRaw) / TURBO_MONTHLY_PRICE;
    expirationDate.setMonth(expirationDate.getMonth() + months);

    const surplus = Number(amountRaw) % TURBO_MONTHLY_PRICE;
    const surplusSeconds = surplus / MONTHLY_PRICE_PER_SECOND;
    expirationDate.setSeconds(expirationDate.getSeconds() + surplusSeconds);
  }

  return expirationDate;
}

function computeExpiration(
  currentExpiration: number,
  payment: Payment,
  metadata: any,
  blockTimestamp: number
): Date {
  // If the payment is from the admin address, simply return the expiration date from the metadata
  if (
    payment.sender.toLowerCase() === ADMIN_ADDRESS &&
    payment.amount_raw == 0n
  ) {
    const date = new Date(metadata.params.expiration * MILLISECONDS);
    return isNaN(date.getTime()) ? new Date(0) : date;
  }

  return computeExpirationFromAmount(
    payment.amount_raw,
    currentExpiration,
    blockTimestamp
  );
}

export function createEvmWriters(indexerName: string) {
  const spacePrefix = SPACE_PREFIXES[indexerName];

  function skip(txId: string, reason: string) {
    console.log(`[evm] skipped payment ${txId}: ${reason}`);
  }

  const handlePaymentReceived: evm.Writer<
    typeof SchnapsAbi,
    'PaymentReceived'
  > = async ({ block, txId, event }) => {
    if (!block || !event) return;

    // Prevent indexing test batch txs
    if ([24898810, 24899177, 24899186].includes(Number(block.number))) return;

    const { sender, token, amount, barcode } = event.args;
    const tokenAddress = token.toLowerCase();
    const amountRaw = BigInt(amount);

    // Entities are written to the database after this writer returns, and a
    // value the database rejects would stall the indexer on this block forever,
    // so every field is checked before any is set.
    if (amountRaw > MAX_INT64 || !isText(barcode)) {
      return skip(txId, 'out of range');
    }

    try {
      const creditsSpace = parseCreditsBarcode(barcode, spacePrefix);
      let spaceId: string, tokenSymbol: string, decimals: number;
      let metadata: any = null;

      if (creditsSpace) {
        if (tokenAddress !== NATIVE_TOKEN || amountRaw < MIN_CREDITS_WEI) {
          return skip(txId, 'invalid credits payment');
        }
        [spaceId, tokenSymbol, decimals] = [creditsSpace, 'ETH', 18];
      } else {
        // Pro only accepts allowlisted stablecoins and content-addressed
        // barcodes, both checked before the metadata fetch
        tokenSymbol = getTokenSymbol(tokenAddress, indexerName);
        if (!tokenSymbol || !CID_REGEX.test(barcode)) {
          return skip(txId, 'not a Pro payment');
        }
        metadata = await getJSON(barcode).catch(err => {
          capture(err);
          return null;
        });
        if (metadata?.type !== 'turbo' || !isText(metadata.params?.space)) {
          return skip(txId, 'invalid metadata');
        }
        spaceId =
          MIGRATED_TURBO_SPACES[metadata.params.space] ?? metadata.params.space;
        decimals = DECIMALS_COUNT;
      }
      console.log('Payment received for space', spaceId);

      const payment = new Payment(txId, indexerName);
      payment.sender = sender;
      payment.token_address = tokenAddress;
      payment.token_symbol = tokenSymbol;
      payment.amount_raw = amountRaw;
      payment.amount_decimal = formatUnits(amountRaw, decimals);
      payment.barcode = barcode;
      payment.block = Number(block.number);
      payment.timestamp = Number(block.timestamp);
      payment.type = metadata ? 'turbo' : 'credits';
      payment.space = spaceId;
      if (isText(metadata?.ref)) payment.ref = metadata.ref;

      const space =
        (await Space.loadEntity(spaceId, indexerName)) ??
        new Space(spaceId, indexerName);

      if (metadata) {
        // A space paying both ways extends from the later of its two expirations
        const stripeSpace = await Space.loadEntity(spaceId, STRIPE_INDEXER);
        const seconds =
          computeExpiration(
            Math.max(
              space.turbo_expiration,
              stripeSpace?.turbo_expiration ?? 0
            ),
            payment,
            metadata,
            Number(block.timestamp)
          ).getTime() / MILLISECONDS;
        // Clamped to the 32-bit column instead of failing the write
        space.turbo_expiration = Number.isFinite(seconds)
          ? Math.min(seconds, MAX_INT32)
          : MAX_INT32;
        space.turbo_expiration_date = new Date(
          space.turbo_expiration * MILLISECONDS
        ).toDateString();
      } else {
        // Loaded int8 values come back as strings, new entities start at 0
        space.credits = BigInt(space.credits) + amountRaw / 1_000_000_000n; // gwei
      }

      await payment.save();
      await space.save();
      notifyPayment(payment, space, block, txId, indexerName).catch(capture);
    } catch (err) {
      capture(err);
      skip(txId, 'failed to process');
    }
  };

  return {
    handlePaymentReceived
  };
}
