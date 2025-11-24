import { BigNumber } from '@ethersproject/bignumber';
import { Contract } from '@ethersproject/contracts';
import { JsonRpcSigner } from '@ethersproject/providers';
import { abis } from './abis';
import { Auction, AUCTION_CONTRACT_ADDRESSES } from './index';

export async function placeSellOrder(
  signer: JsonRpcSigner,
  auction: Auction,
  buyAmount: number,
  sellAmount: number
) {
  const contractAddress = AUCTION_CONTRACT_ADDRESSES[auction.network];
  const contract = new Contract(contractAddress, abis, signer);
  const lastSellOrderId =
    '0x0000000000000000000000000000000000000000000000000000000000000001';
  const rawSellAmount = BigNumber.from(
    sellAmount * 10 ** Number(auction.decimalsBiddingToken)
  );
  const rawBuyAmount = BigNumber.from(
    buyAmount * 10 ** Number(auction.decimalsAuctioningToken)
  );

  return contract.placeSellOrders(
    auction.id,
    [rawBuyAmount],
    [rawSellAmount],
    [lastSellOrderId],
    auction.allowListSigner
  );
}
