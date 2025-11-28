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
  const price = parseFloat(sellOrder.price);
  const buyAmount = (
    price
      ? (parseFloat(sellOrder.sellAmount) / price).toFixed(
          Number(auction.decimalsAuctioningToken)
        )
      : 0
  ).toString();
  const rawBuyAmount = parseUnits(buyAmount, auction.decimalsAuctioningToken);

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
  signer: JsonRpcSigner,
  auction: Auction,
  order: Order
) {
  const contractAddress = AUCTION_CONTRACT_ADDRESSES[auction.network];
  const contract = new Contract(contractAddress, abis, signer);
  console.log(order);
  return contract.cancelSellOrders(auction.id, [
    encodeOrder({
      sellAmount: BigNumber.from(order.sellAmount),
      buyAmount: BigNumber.from(order.buyAmount),
      userId: BigNumber.from(order.userId)
    })
  ]);
}
