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

gql(`
  fragment orderDetail on Order {
    id
    sellAmount
    buyAmount
    userAddress
    price
    volume
    timestamp
  }
`);

export const auctionQuery = gql(`
  query GetAuction($id: ID!) {
    auctionDetail(id: $id) {
      ...auctionDetail
    }
  }
`);

export const ordersQuery = gql(`
  query GetOrders($id: BigInt!, $skip: Int, $first: Int, $orderBy: Order_orderBy, $orderDirection: OrderDirection) {
    orders(where: { auctionId: $id }, orderBy: $orderBy, orderDirection: $orderDirection, skip: $skip, first: $first) {
      ...orderDetail
    }
  }
`);
