// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./SnackMarket.sol";

/// @title SnackFactory
/// @notice Creates and indexes prediction markets for Snapshot proposals
contract SnackFactory {
    using SafeERC20 for IERC20;

    IERC20 public immutable usdc;
    address public immutable oracle;

    mapping(bytes32 => address) public markets;

    event MarketCreated(bytes32 indexed referenceId, string referenceUri, address market);

    error MarketAlreadyExists();
    error MarketDoesNotExist();

    constructor(address _usdc, address _oracle) {
        usdc = IERC20(_usdc);
        oracle = _oracle;
    }

    /// @notice Create a new prediction market
    /// @param referenceUri The Snapshot proposal URI (e.g. "snapshot://s:aave.eth/proposal/0x123...")
    function createMarket(string calldata referenceUri) external returns (address) {
        bytes32 refId = keccak256(abi.encodePacked(referenceUri));
        if (markets[refId] != address(0)) revert MarketAlreadyExists();

        SnackMarket market = new SnackMarket(refId, referenceUri, address(usdc), oracle);
        markets[refId] = address(market);

        emit MarketCreated(refId, referenceUri, address(market));
        return address(market);
    }

    /// @notice Create market and buy in one transaction (for first trade)
    /// @param referenceUri The Snapshot proposal URI
    /// @param outcome YES (0) or NO (1)
    /// @param usdcAmount Amount of USDC to spend
    function createAndBuy(
        string calldata referenceUri,
        uint8 outcome,
        uint256 usdcAmount
    ) external returns (address) {
        bytes32 refId = keccak256(abi.encodePacked(referenceUri));
        if (markets[refId] != address(0)) revert MarketAlreadyExists();

        SnackMarket market = new SnackMarket(refId, referenceUri, address(usdc), oracle);
        markets[refId] = address(market);

        emit MarketCreated(refId, referenceUri, address(market));

        // Transfer USDC from user to market, then buy
        usdc.safeTransferFrom(msg.sender, address(this), usdcAmount);
        usdc.approve(address(market), usdcAmount);
        market.buyOutcome(outcome, usdcAmount);

        // Transfer minted tokens to the user
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
