import { Contract } from '@ethersproject/contracts';
import { Web3Provider } from '@ethersproject/providers';
import { parseUnits } from '@ethersproject/units';
import { abis } from './abis';
import { AuctionDetailFragment } from './gql/graphql';
import {
  AUCTION_CONTRACT_ADDRESSES,
  AuctionNetworkId,
  encodeOrder,
  getPreviousOrderId,
  Order,
  SellOrder
} from './index';

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
  const rawSellAmount = parseUnits(
    sellOrder.sellAmount,
    auction.decimalsBiddingToken
  );
  const rawPrice = parseUnits(sellOrder.price, auction.decimalsBiddingToken);

  if (rawPrice.isZero()) {
    throw new Error('Price cannot be zero');
  }

  const rawBuyAmount = rawSellAmount
    .mul(10 ** Number(auction.decimalsBiddingToken))
    .div(rawPrice);

  try {
    previousOrderId = await getPreviousOrderId(
      auction.id,
      networkId,
      sellOrder.price
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
    [rawBuyAmount],
    [rawSellAmount],
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
