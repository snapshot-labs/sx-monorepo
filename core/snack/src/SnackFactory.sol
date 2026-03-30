// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./SnackMarket.sol";

/// @title SnackFactory
/// @notice Creates and indexes prediction markets for Snapshot proposals
contract SnackFactory {
    address public immutable oracle;

    mapping(bytes32 => address) public markets;

    event MarketCreated(bytes32 indexed referenceId, string referenceUri, address market);

    error MarketAlreadyExists();

    constructor(address _oracle) {
        oracle = _oracle;
    }

    /// @notice Create a new prediction market
    function createMarket(string calldata referenceUri) external returns (address) {
        bytes32 refId = keccak256(abi.encodePacked(referenceUri));
        if (markets[refId] != address(0)) revert MarketAlreadyExists();

        SnackMarket market = new SnackMarket(refId, referenceUri, oracle);
        markets[refId] = address(market);

        emit MarketCreated(refId, referenceUri, address(market));
        return address(market);
    }

    /// @notice Create market and buy in one transaction
    function createAndBuy(
        string calldata referenceUri,
        uint8 outcome
    ) external payable returns (address) {
        bytes32 refId = keccak256(abi.encodePacked(referenceUri));
        if (markets[refId] != address(0)) revert MarketAlreadyExists();

        SnackMarket market = new SnackMarket(refId, referenceUri, oracle);
        markets[refId] = address(market);

        emit MarketCreated(refId, referenceUri, address(market));

        // Buy outcome tokens and transfer to user
        market.buyOutcome{value: msg.value}(outcome);
        uint256 minted = market.balanceOf(address(this), outcome);
        market.safeTransferFrom(address(this), msg.sender, outcome, minted, "");

        return address(market);
    }

    /// @notice Look up a market by reference URI
    function getMarket(string calldata referenceUri) external view returns (address) {
        return markets[keccak256(abi.encodePacked(referenceUri))];
    }

    /// @notice Look up a market by reference ID hash
    function getMarketById(bytes32 refId) external view returns (address) {
        return markets[refId];
    }

    /// @notice Required to receive ERC1155 tokens during createAndBuy
    function onERC1155Received(address, address, uint256, uint256, bytes calldata) external pure returns (bytes4) {
        return this.onERC1155Received.selector;
    }
}
