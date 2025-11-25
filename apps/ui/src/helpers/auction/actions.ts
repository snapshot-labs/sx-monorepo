import { BigNumber } from '@ethersproject/bignumber';
import { Contract } from '@ethersproject/contracts';
import { JsonRpcSigner } from '@ethersproject/providers';
import { abis } from './abis';
import { Auction, AUCTION_CONTRACT_ADDRESSES, getPreviousOrder } from './index';

export async function placeSellOrder(
  signer: JsonRpcSigner,
  auction: Auction,
  buyAmount: number,
  sellAmount: number
) {
  const contractAddress = AUCTION_CONTRACT_ADDRESSES[auction.network];
  const contract = new Contract(contractAddress, abis, signer);
  const rawSellAmount = BigNumber.from(
    sellAmount * 10 ** Number(auction.decimalsBiddingToken)
  );
  const rawBuyAmount = BigNumber.from(
    buyAmount * 10 ** Number(auction.decimalsAuctioningToken)
  );
  const price = sellAmount / buyAmount;
  let previousOrder = '';

  try {
    previousOrder = await getPreviousOrder(auction.id, auction.network, price);
  } catch (e) {
    console.log(
      `Error trying to get previous order for auctionId ${auction.id}`,
      e
    );
  }

  return contract.placeSellOrders(
    auction.id,
    [rawBuyAmount],
    [rawSellAmount],
    [previousOrder],
    auction.allowListSigner
  );
}
