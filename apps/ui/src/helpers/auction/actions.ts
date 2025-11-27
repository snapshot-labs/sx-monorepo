import { Contract } from '@ethersproject/contracts';
import { Web3Provider } from '@ethersproject/providers';
import { parseUnits } from '@ethersproject/units';
import { abis } from './abis';
import { AuctionDetailFragment } from './gql/graphql';
import {
  AUCTION_CONTRACT_ADDRESSES,
  AuctionNetworkId,
  getPreviousOrderId,
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
  let previousOrderId = '';
  const rawSellAmount = parseUnits(
    sellOrder.sellAmount,
    auction.decimalsBiddingToken
  );
  const rawBuyAmount = parseUnits(
    (parseFloat(sellOrder.sellAmount) / parseFloat(sellOrder.price)).toString(),
    auction.decimalsAuctioningToken
  );

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
    [rawSellAmount],
    [rawBuyAmount],
    [previousOrderId],

    auction.allowListSigner
  );
}
