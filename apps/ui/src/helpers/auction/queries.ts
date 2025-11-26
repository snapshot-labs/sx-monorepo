import { gql } from './gql';

gql(`
  fragment auctionDetail on AuctionDetail {
    id
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
  fragment order on Order {
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
  query GetOrders($id: ID!, $skip: Int, $first: Int, $orderBy: Order_orderBy, $orderDirection: OrderDirection, $orderFilter: Order_filter) {
    auctionDetail(id: $id) {
      orders(orderBy: $orderBy, orderDirection: $orderDirection, skip: $skip, first: $first, where: $orderFilter) {
        ...order
      }
    }
  }
`);
