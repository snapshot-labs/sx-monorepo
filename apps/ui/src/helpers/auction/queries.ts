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
    currentBiddingAmount
    currentClearingPrice
    currentClearingOrderBuyAmount
    currentClearingOrderSellAmount
    clearingPriceOrder
    volumeClearingPriceOrder
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

gql(`
  fragment order on Order {
    id
    userId
    sellAmount
    buyAmount
    userId
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

export const previousOrderQuery = gql(`
  query GetPreviousOrder($id: ID!, $price: BigDecimal) {
    auctionDetail(id: $id) {
      ordersWithoutClaimed(orderBy: price, orderDirection: asc, where: {price_gt: $price}) {
        ...order
      }
    }
  }
`);

export const unclaimedOrdersQuery = gql(`
  query GetUnclaimedOrders($id: ID!, $orderFilter: Order_filter) {
    auctionDetail(id: $id) {
      ordersWithoutClaimed(where: $orderFilter) {
        id
      }
    }
  }
`);
