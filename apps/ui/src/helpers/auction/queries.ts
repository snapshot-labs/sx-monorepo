import { gql } from './gql';

gql(`
  fragment auctionDetail on AuctionDetail {
    addressAuctioningToken
    addressBiddingToken
    symbolAuctioningToken
    symbolBiddingToken
    decimalsAuctioningToken
    decimalsBiddingToken
    orderCancellationEndDate
    endTimeTimestamp
    startingTimeStamp
    minimumBiddingAmountPerOrder
    minFundingThreshold
    currentClearingPrice
    isAtomicClosureAllowed
    isPrivateAuction
    allowListSigner
    exactOrder {
      sellAmount
      price
    }
  }
`);

export const auctionQuery = gql(`
  query GetAuction($id: ID!) {
    auctionDetail(id: $id) {
      ...auctionDetail
    }
  }
`);
