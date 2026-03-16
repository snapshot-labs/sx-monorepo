// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../src/SnackMarket.sol";
import "../src/MockUSDC.sol";

contract SnackMarketTest is Test {
    SnackMarket market;
    MockUSDC usdc;
    address oracle = address(0xBEEF);
    address alice = address(0xA11CE);
    address bob = address(0xB0B);

    function setUp() public {
        usdc = new MockUSDC();
        market = new SnackMarket(
            keccak256("test://proposal/1"),
            "test://proposal/1",
            address(usdc),
            oracle
        );

        usdc.mint(alice, 10_000e6);
        usdc.mint(bob, 10_000e6);

        vm.prank(alice);
        usdc.approve(address(market), type(uint256).max);
        vm.prank(bob);
        usdc.approve(address(market), type(uint256).max);
    }

    function test_firstBuyYes() public {
        vm.prank(alice);
        market.buyOutcome(0, 100e6); // Buy YES with 100 USDC

        assertEq(market.supplyYes(), 100e6);
        assertEq(market.supplyNo(), 0);
        assertEq(market.reserve(), 100e6);
        assertEq(market.balanceOf(alice, 0), 100e6);
    }

    function test_firstBuyNo() public {
        vm.prank(alice);
        market.buyOutcome(1, 100e6); // Buy NO with 100 USDC

        assertEq(market.supplyNo(), 100e6);
        assertEq(market.supplyYes(), 0);
        assertEq(market.reserve(), 100e6);
        assertEq(market.balanceOf(alice, 1), 100e6);
    }

    function test_buyYesThenNo() public {
        vm.prank(alice);
        market.buyOutcome(0, 100e6); // Buy YES

        vm.prank(bob);
        market.buyOutcome(1, 100e6); // Buy NO

        // Reserve should be 200 USDC
        assertEq(market.reserve(), 200e6);

        // Check prices sum to ~1e18
        (uint256 yesPrice, uint256 noPrice) = market.getPrices();
        assertApproxEqAbs(yesPrice + noPrice, 1e18, 1); // Allow 1 wei rounding
    }

    function test_priceMovesOnBuy() public {
        // Buy equal amounts
        vm.prank(alice);
        market.buyOutcome(0, 100e6);
        vm.prank(bob);
        market.buyOutcome(1, 100e6);

        (uint256 yesBefore, ) = market.getPrices();

        // Buy more YES → price should go up
        vm.prank(alice);
        market.buyOutcome(0, 50e6);

        (uint256 yesAfter, ) = market.getPrices();
        assertGt(yesAfter, yesBefore);
    }

    function test_sellReturnsUsdc() public {
        vm.prank(alice);
        market.buyOutcome(0, 100e6);

        uint256 balBefore = usdc.balanceOf(alice);

        vm.prank(alice);
        market.sellOutcome(0, 50e6);

        uint256 balAfter = usdc.balanceOf(alice);
        assertGt(balAfter, balBefore);
        assertEq(market.supplyYes(), 50e6);
    }

    function test_sellAllReturnsReserve() public {
        vm.prank(alice);
        market.buyOutcome(0, 100e6);

        uint256 balBefore = usdc.balanceOf(alice);

        vm.prank(alice);
        market.sellOutcome(0, 100e6);

        uint256 balAfter = usdc.balanceOf(alice);
        // Should get back all 100 USDC (minus rounding)
        assertApproxEqAbs(balAfter - balBefore, 100e6, 1);
        assertEq(market.reserve(), 0);
    }

    function test_resolveAndRedeem() public {
        vm.prank(alice);
        market.buyOutcome(0, 100e6); // Alice buys YES

        vm.prank(bob);
        market.buyOutcome(1, 100e6); // Bob buys NO

        uint256 totalReserve = market.reserve();

        // Oracle resolves YES wins
        vm.prank(oracle);
        market.resolve(0);

        assertTrue(market.resolved());
        assertEq(market.winningOutcome(), 0);

        // Alice redeems
        uint256 balBefore = usdc.balanceOf(alice);
        vm.prank(alice);
        market.redeem();

        uint256 payout = usdc.balanceOf(alice) - balBefore;
        assertEq(payout, totalReserve); // Alice gets the full reserve
    }

    function test_multipleWinnersRedeem() public {
        vm.prank(alice);
        market.buyOutcome(0, 100e6);

        vm.prank(bob);
        market.buyOutcome(0, 100e6);

        vm.prank(alice);
        market.buyOutcome(1, 50e6); // Some NO tokens too

        uint256 totalReserve = market.reserve();

        vm.prank(oracle);
        market.resolve(0); // YES wins

        uint256 aliceYes = market.balanceOf(alice, 0);
        uint256 bobYes = market.balanceOf(bob, 0);
        uint256 totalYes = market.supplyYes();

        // Both redeem
        vm.prank(alice);
        market.redeem();
        vm.prank(bob);
        market.redeem();

        // Payouts should be proportional
        uint256 alicePayout = (aliceYes * totalReserve) / totalYes;
        uint256 bobPayout = (bobYes * totalReserve) / totalYes;
        assertApproxEqAbs(alicePayout + bobPayout, totalReserve, 1);
    }

    function test_cannotBuyAfterResolution() public {
        vm.prank(alice);
        market.buyOutcome(0, 100e6);

        vm.prank(oracle);
        market.resolve(0);

        vm.prank(bob);
        vm.expectRevert(SnackMarket.MarketAlreadyResolved.selector);
        market.buyOutcome(0, 100e6);
    }

    function test_cannotSellAfterResolution() public {
        vm.prank(alice);
        market.buyOutcome(0, 100e6);

        vm.prank(oracle);
        market.resolve(0);

        vm.prank(alice);
        vm.expectRevert(SnackMarket.MarketAlreadyResolved.selector);
        market.sellOutcome(0, 50e6);
    }

    function test_onlyOracleCanResolve() public {
        vm.prank(alice);
        market.buyOutcome(0, 100e6);

        vm.prank(alice);
        vm.expectRevert(SnackMarket.OnlyOracle.selector);
        market.resolve(0);
    }

    function test_cannotRedeemBeforeResolution() public {
        vm.prank(alice);
        market.buyOutcome(0, 100e6);

        vm.prank(alice);
        vm.expectRevert(SnackMarket.MarketNotResolved.selector);
        market.redeem();
    }

    function test_loserCannotRedeem() public {
        vm.prank(alice);
        market.buyOutcome(0, 100e6);

        vm.prank(bob);
        market.buyOutcome(1, 100e6);

        vm.prank(oracle);
        market.resolve(0); // YES wins

        vm.prank(bob);
        vm.expectRevert(SnackMarket.NothingToRedeem.selector);
        market.redeem(); // Bob has NO tokens, not YES
    }

    function test_previewBuy() public {
        vm.prank(alice);
        market.buyOutcome(0, 100e6);

        uint256 preview = market.previewBuy(1, 50e6);
        assertGt(preview, 0);

        // Actually buy and compare
        vm.prank(bob);
        market.buyOutcome(1, 50e6);
        assertEq(market.balanceOf(bob, 1), preview);
    }

    function test_previewSell() public {
        vm.prank(alice);
        market.buyOutcome(0, 100e6);

        uint256 preview = market.previewSell(0, 50e6);
        assertGt(preview, 0);

        uint256 balBefore = usdc.balanceOf(alice);
        vm.prank(alice);
        market.sellOutcome(0, 50e6);
        assertEq(usdc.balanceOf(alice) - balBefore, preview);
    }

    function test_emptyMarketPrices() public view {
        (uint256 yesPrice, uint256 noPrice) = market.getPrices();
        assertEq(yesPrice, 0.5e18);
        assertEq(noPrice, 0.5e18);
    }
}
