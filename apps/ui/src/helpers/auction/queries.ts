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
    currentBiddingAmount
    currentClearingPrice
    isAtomicClosureAllowed
    isPrivateAuction
    allowListSigner
    exactOrder {
      sellAmount
      price
    }
    ordersWithoutClaimed {
      id
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
