// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

/// @title SnackMarket
/// @notice Prediction market using Prophet bonding curve: reserve = sqrt(supplyYes² + supplyNo²)
/// @dev Prices always sum to 1. No initial liquidity required. No arbitrage.
contract SnackMarket is ERC1155 {
    using SafeERC20 for IERC20;

    uint8 public constant YES = 0;
    uint8 public constant NO = 1;
    uint8 public constant UNRESOLVED = 0xFF;

    IERC20 public immutable usdc;
    address public immutable oracle;
    bytes32 public immutable referenceId;
    string public referenceUri;

    uint256 public supplyYes;
    uint256 public supplyNo;
    uint256 public reserve;

    bool public resolved;
    uint8 public winningOutcome = UNRESOLVED;

    event OutcomeBought(address indexed buyer, uint8 outcome, uint256 usdcAmount, uint256 tokensMinted);
    event OutcomeSold(address indexed seller, uint8 outcome, uint256 tokensBurned, uint256 usdcReturned);
    event MarketResolved(uint8 winningOutcome);
    event Redeemed(address indexed user, uint256 usdcAmount);

    error MarketAlreadyResolved();
    error MarketNotResolved();
    error OnlyOracle();
    error InvalidOutcome();
    error ZeroAmount();
    error InsufficientBalance();
    error NothingToRedeem();
    error AlreadyRedeemed();

    constructor(
        bytes32 _referenceId,
        string memory _referenceUri,
        address _usdc,
        address _oracle
    ) ERC1155("") {
        referenceId = _referenceId;
        referenceUri = _referenceUri;
        usdc = IERC20(_usdc);
        oracle = _oracle;
    }

    /// @notice Buy outcome tokens with USDC
    /// @param outcome YES (0) or NO (1)
    /// @param usdcAmount Amount of USDC to spend (6 decimals)
    function buyOutcome(uint8 outcome, uint256 usdcAmount) external {
        if (resolved) revert MarketAlreadyResolved();
        if (outcome > NO) revert InvalidOutcome();
        if (usdcAmount == 0) revert ZeroAmount();

        usdc.safeTransferFrom(msg.sender, address(this), usdcAmount);

        uint256 newReserve = reserve + usdcAmount;
        uint256 tokensMinted;

        if (outcome == YES) {
            // newReserve² = newSupplyYes² + supplyNo²
            // newSupplyYes = sqrt(newReserve² - supplyNo²)
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

        emit OutcomeBought(msg.sender, outcome, usdcAmount, tokensMinted);
    }

    /// @notice Sell outcome tokens back for USDC
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
        uint256 usdcReturned = reserve - newReserve;

        supplyYes = newSupplyYes;
        supplyNo = newSupplyNo;
        reserve = newReserve;

        _burn(msg.sender, outcome, tokenAmount);
        usdc.safeTransfer(msg.sender, usdcReturned);

        emit OutcomeSold(msg.sender, outcome, tokenAmount, usdcReturned);
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

    /// @notice Winners redeem their tokens for USDC
    function redeem() external {
        if (!resolved) revert MarketNotResolved();

        uint256 userBalance = balanceOf(msg.sender, winningOutcome);
        if (userBalance == 0) revert NothingToRedeem();

        uint256 winningSupply = winningOutcome == YES ? supplyYes : supplyNo;
        uint256 payout = (userBalance * reserve) / winningSupply;

        // Burn winning tokens
        _burn(msg.sender, winningOutcome, userBalance);

        // Update state
        if (winningOutcome == YES) {
            supplyYes -= userBalance;
        } else {
            supplyNo -= userBalance;
        }
        reserve -= payout;

        usdc.safeTransfer(msg.sender, payout);

        emit Redeemed(msg.sender, payout);
    }

    /// @notice Get implied probabilities (scaled by 1e18, sum to 1e18)
    /// @dev Normalized from marginal prices so they sum to 1
    /// @return yesProb Implied probability of YES (1e18 = 100%)
    /// @return noProb Implied probability of NO (1e18 = 100%)
    function getPrices() external view returns (uint256 yesProb, uint256 noProb) {
        if (supplyYes == 0 && supplyNo == 0) {
            return (0.5e18, 0.5e18);
        }
        uint256 total = supplyYes + supplyNo;
        yesProb = (supplyYes * 1e18) / total;
        noProb = 1e18 - yesProb; // Ensure they sum to exactly 1e18
    }

    /// @notice Preview how many tokens you'd get for a given USDC amount
    function previewBuy(uint8 outcome, uint256 usdcAmount) external view returns (uint256 tokensMinted) {
        if (outcome > NO || usdcAmount == 0) return 0;
        uint256 newReserve = reserve + usdcAmount;
        if (outcome == YES) {
            uint256 newSupplyYes = Math.sqrt(newReserve * newReserve - supplyNo * supplyNo);
            tokensMinted = newSupplyYes - supplyYes;
        } else {
            uint256 newSupplyNo = Math.sqrt(newReserve * newReserve - supplyYes * supplyYes);
            tokensMinted = newSupplyNo - supplyNo;
        }
    }

    /// @notice Preview how much USDC you'd get for selling tokens
    function previewSell(uint8 outcome, uint256 tokenAmount) external view returns (uint256 usdcReturned) {
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
        usdcReturned = reserve - newReserve;
    }
}
