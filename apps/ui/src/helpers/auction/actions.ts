import { Contract } from '@ethersproject/contracts';
import { Web3Provider } from '@ethersproject/providers';
import Decimal from 'decimal.js';
import {
  AUCTION_CONTRACT_ADDRESSES,
  AuctionNetworkId,
  getPreviousOrderId,
  Order,
  SellOrder
} from './';
import { abis } from './abis';
import { AuctionDetailFragment } from './gql/graphql';
import { encodeOrder } from './orders';

const PRICE_PRECISION = 34;

Decimal.set({ precision: PRICE_PRECISION });

export async function placeSellOrder(
  web3: Web3Provider,
  auction: AuctionDetailFragment,
  networkId: AuctionNetworkId,
  sellOrder: SellOrder
) {
  const contract = new Contract(
    AUCTION_CONTRACT_ADDRESSES[networkId],
    abis,
    web3.getSigner()
  );
  let previousOrderId: string;

  const price = new Decimal(sellOrder.sellAmount).div(
    new Decimal(sellOrder.buyAmount)
  );

  try {
    previousOrderId = await getPreviousOrderId(
      auction.id,
      networkId,
      price.toFixed(PRICE_PRECISION)
    );
  } catch (e) {
    console.error(
      `Error trying to get previous order for auctionId ${auction.id}`,
      e
    );

    throw new Error('Unable to get previous order ID');
  }

  return contract.placeSellOrders(
    auction.id,
    [sellOrder.buyAmount],
    [sellOrder.sellAmount],
    [previousOrderId],
    auction.allowListSigner
  );
}

export async function cancelSellOrder(
  web3: Web3Provider,
  auction: AuctionDetailFragment,
  networkId: AuctionNetworkId,
  order: Order
) {
  const contractAddress = AUCTION_CONTRACT_ADDRESSES[networkId];
  const contract = new Contract(contractAddress, abis, web3.getSigner());

  return contract.cancelSellOrders(auction.id, [
    encodeOrder({
      sellAmount: BigInt(order.sellAmount),
      buyAmount: BigInt(order.buyAmount),
      userId: BigInt(order.userId)
    })
  ]);
}

export async function claimFromParticipantOrder(
  web3: Web3Provider,
  networkId: AuctionNetworkId,
  auction: AuctionDetailFragment,
  orders: Order[]
) {
  const contract = new Contract(
    AUCTION_CONTRACT_ADDRESSES[networkId],
    abis,
    web3.getSigner()
  );

  return contract.claimFromParticipantOrder(
    auction.id,
    orders.map(order =>
      encodeOrder({
        userId: BigInt(order.userId),
        buyAmount: BigInt(order.buyAmount),
        sellAmount: BigInt(order.sellAmount)
      })
    )
  );
}
