export const abis = [
  'function auctionData(uint256 auctionId) view returns (address auctioningToken, address biddingToken, uint256 orderCancellationEndDate, uint256 auctionEndDate, bytes32 initialAuctionOrder, uint256 minimumBiddingAmountPerOrder, uint256 interimSumBidAmount, bytes32 interimOrder, bytes32 clearingPriceOrder, uint96 volumeClearingPriceOrder, bool minFundingThresholdNotReached, bool isAtomicClosureAllowed, uint256 feeNumerator, uint256 minFundingThreshold)',
  'function placeSellOrders(uint256 auctionId, uint96[] _minBuyAmounts, uint96[] _sellAmounts, bytes32[] _prevSellOrders, bytes allowListCallData) returns (uint64 userId)',
  'function cancelSellOrders(uint256 auctionId, bytes32[] _sellOrders)'
];
