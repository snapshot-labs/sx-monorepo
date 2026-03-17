// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

/// @title SnackMarket
/// @notice Prediction market using Prophet bonding curve: reserve = sqrt(supplyYes² + supplyNo²)
/// @dev Prices always sum to 1. No initial liquidity required. No arbitrage.
contract SnackMarket is ERC1155 {
    uint8 public constant YES = 0;
    uint8 public constant NO = 1;
    uint8 public constant UNRESOLVED = 0xFF;

    address public immutable oracle;
    bytes32 public immutable referenceId;
    string public referenceUri;

    uint256 public supplyYes;
    uint256 public supplyNo;
    uint256 public reserve;

    bool public resolved;
    uint8 public winningOutcome = UNRESOLVED;

    event OutcomeBought(address indexed buyer, uint8 outcome, uint256 ethAmount, uint256 tokensMinted);
    event OutcomeSold(address indexed seller, uint8 outcome, uint256 tokensBurned, uint256 ethReturned);
    event MarketResolved(uint8 winningOutcome);
    event Redeemed(address indexed user, uint256 ethAmount);

    error MarketAlreadyResolved();
    error MarketNotResolved();
    error OnlyOracle();
    error InvalidOutcome();
    error ZeroAmount();
    error InsufficientBalance();
    error NothingToRedeem();
    error TransferFailed();

    constructor(
        bytes32 _referenceId,
        string memory _referenceUri,
        address _oracle
    ) ERC1155("") {
        referenceId = _referenceId;
        referenceUri = _referenceUri;
        oracle = _oracle;
    }

    /// @notice Buy outcome tokens with ETH
    /// @param outcome YES (0) or NO (1)
    function buyOutcome(uint8 outcome) external payable {
        if (resolved) revert MarketAlreadyResolved();
        if (outcome > NO) revert InvalidOutcome();
        if (msg.value == 0) revert ZeroAmount();

        uint256 newReserve = reserve + msg.value;
        uint256 tokensMinted;

        if (outcome == YES) {
            uint256 newSupplyYes = Math.sqrt(newReserve * newReserve - supplyNo * supplyNo);
            tokensMinted = newSupplyYes - supplyYes;
            supplyYes = newSupplyYes;
        } else {
            uint256 newSupplyNo = Math.sqrt(newReserve * newReserve - supplyYes * supplyYes);
            tokensMinted = newSupplyNo - supplyNo;
            supplyNo = newSupplyNo;
        }

        reserve = newReserve;
        _mint(msg.sender, outcome, tokensMinted, "");

        emit OutcomeBought(msg.sender, outcome, msg.value, tokensMinted);
    }

    /// @notice Sell outcome tokens back for ETH
    /// @param outcome YES (0) or NO (1)
    /// @param tokenAmount Amount of tokens to sell
    function sellOutcome(uint8 outcome, uint256 tokenAmount) external {
        if (resolved) revert MarketAlreadyResolved();
        if (outcome > NO) revert InvalidOutcome();
        if (tokenAmount == 0) revert ZeroAmount();
        if (balanceOf(msg.sender, outcome) < tokenAmount) revert InsufficientBalance();

        uint256 newSupplyYes = supplyYes;
        uint256 newSupplyNo = supplyNo;

        if (outcome == YES) {
            newSupplyYes -= tokenAmount;
        } else {
            newSupplyNo -= tokenAmount;
        }

        uint256 newReserve = Math.sqrt(newSupplyYes * newSupplyYes + newSupplyNo * newSupplyNo);
        uint256 ethReturned = reserve - newReserve;

        supplyYes = newSupplyYes;
        supplyNo = newSupplyNo;
        reserve = newReserve;

        _burn(msg.sender, outcome, tokenAmount);

        (bool success, ) = msg.sender.call{value: ethReturned}("");
        if (!success) revert TransferFailed();

        emit OutcomeSold(msg.sender, outcome, tokenAmount, ethReturned);
    }

    /// @notice Oracle resolves the market
    /// @param _winningOutcome YES (0) or NO (1)
    function resolve(uint8 _winningOutcome) external {
        if (msg.sender != oracle) revert OnlyOracle();
        if (resolved) revert MarketAlreadyResolved();
        if (_winningOutcome > NO) revert InvalidOutcome();

        resolved = true;
        winningOutcome = _winningOutcome;

        emit MarketResolved(_winningOutcome);
    }

    /// @notice Winners redeem their tokens for ETH
    function redeem() external {
        if (!resolved) revert MarketNotResolved();

        uint256 userBalance = balanceOf(msg.sender, winningOutcome);
        if (userBalance == 0) revert NothingToRedeem();

        uint256 winningSupply = winningOutcome == YES ? supplyYes : supplyNo;
        uint256 payout = (userBalance * reserve) / winningSupply;

        _burn(msg.sender, winningOutcome, userBalance);

        if (winningOutcome == YES) {
            supplyYes -= userBalance;
        } else {
            supplyNo -= userBalance;
        }
        reserve -= payout;

        (bool success, ) = msg.sender.call{value: payout}("");
        if (!success) revert TransferFailed();

        emit Redeemed(msg.sender, payout);
    }

    /// @notice Get implied probabilities (scaled by 1e18, sum to 1e18)
    function getPrices() external view returns (uint256 yesProb, uint256 noProb) {
        if (supplyYes == 0 && supplyNo == 0) {
            return (0.5e18, 0.5e18);
        }
        uint256 total = supplyYes + supplyNo;
        yesProb = (supplyYes * 1e18) / total;
        noProb = 1e18 - yesProb;
    }

    /// @notice Preview how many tokens you'd get for a given ETH amount
    function previewBuy(uint8 outcome, uint256 ethAmount) external view returns (uint256 tokensMinted) {
        if (outcome > NO || ethAmount == 0) return 0;
        uint256 newReserve = reserve + ethAmount;
        if (outcome == YES) {
            uint256 newSupplyYes = Math.sqrt(newReserve * newReserve - supplyNo * supplyNo);
            tokensMinted = newSupplyYes - supplyYes;
        } else {
            uint256 newSupplyNo = Math.sqrt(newReserve * newReserve - supplyYes * supplyYes);
            tokensMinted = newSupplyNo - supplyNo;
        }
    }

    /// @notice Preview how much ETH you'd get for selling tokens
    function previewSell(uint8 outcome, uint256 tokenAmount) external view returns (uint256 ethReturned) {
        if (outcome > NO || tokenAmount == 0) return 0;
        uint256 newSupplyYes = supplyYes;
        uint256 newSupplyNo = supplyNo;
        if (outcome == YES) {
            if (tokenAmount > newSupplyYes) return 0;
            newSupplyYes -= tokenAmount;
        } else {
            if (tokenAmount > newSupplyNo) return 0;
            newSupplyNo -= tokenAmount;
        }
        uint256 newReserve = Math.sqrt(newSupplyYes * newSupplyYes + newSupplyNo * newSupplyNo);
        ethReturned = reserve - newReserve;
    }

    receive() external payable {}
}
