import { BigNumber } from '@ethersproject/bignumber';
import { Contract } from '@ethersproject/contracts';
import { JsonRpcSigner } from '@ethersproject/providers';
import { abis } from './abis';
import {
  Auction,
  AUCTION_CONTRACT_ADDRESSES,
  getPreviousOrder,
  SellOrder
} from './index';

export async function placeSellOrder(
  signer: JsonRpcSigner,
  auction: Auction,
  sellOrder: SellOrder
) {
  const contractAddress = AUCTION_CONTRACT_ADDRESSES[auction.network];
  const contract = new Contract(contractAddress, abis, signer);
  let previousOrder = '';

  try {
    previousOrder = await getPreviousOrder(
      auction.id,
      auction.network,
      sellOrder.price
    );
  } catch (e) {
    console.log(
      `Error trying to get previous order for auctionId ${auction.id}`,
      e
    );
  }

  const rawSellAmount = BigNumber.from(
    sellOrder.sellAmount * 10 ** Number(auction.decimalsBiddingToken)
  );
  const rawBuyAmount = BigNumber.from(
    Math.floor(
      (sellOrder.sellAmount / sellOrder.price) *
        10 ** Number(auction.decimalsAuctioningToken)
    )
  );

  return contract.placeSellOrders(
    auction.id,
    [rawBuyAmount],
    [rawSellAmount],
    [previousOrder],
    auction.allowListSigner
  );
}
