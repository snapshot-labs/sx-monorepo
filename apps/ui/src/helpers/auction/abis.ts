export const abis = [
  'function auctionData(uint256) view returns (address, address, uint256, uint256, bytes32, uint256, uint256, bytes32, bytes32, uint96, bool, bool, uint256, uint256)',
  'function placeSellOrders(uint256 auctionId, uint96[] _minBuyAmounts, uint96[] _sellAmounts, bytes32[] _prevSellOrders, bytes allowListCallData) returns (uint64 userId)',
  'function cancelSellOrders(uint256 auctionId, bytes32[] _sellOrders)'
];
