// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../src/SnackMarket.sol";

contract SnackMarketTest is Test {
    SnackMarket market;
    address oracle = address(0xBEEF);
    address alice = address(0xA11CE);
    address bob = address(0xB0B);

    function setUp() public {
        market = new SnackMarket(
            keccak256("test://proposal/1"),
            "test://proposal/1",
            oracle
        );

        vm.deal(alice, 10_000e18);
        vm.deal(bob, 10_000e18);
    }

    function test_firstBuyYes() public {
        vm.prank(alice);
        market.buyOutcome{value: 100e18}(0);

        assertEq(market.supplyYes(), 100e18);
        assertEq(market.supplyNo(), 0);
        assertEq(market.reserve(), 100e18);
        assertEq(market.balanceOf(alice, 0), 100e18);
    }

    function test_firstBuyNo() public {
        vm.prank(alice);
        market.buyOutcome{value: 100e18}(1);

        assertEq(market.supplyNo(), 100e18);
        assertEq(market.supplyYes(), 0);
        assertEq(market.reserve(), 100e18);
        assertEq(market.balanceOf(alice, 1), 100e18);
    }

    function test_buyYesThenNo() public {
        vm.prank(alice);
        market.buyOutcome{value: 100e18}(0);

        vm.prank(bob);
        market.buyOutcome{value: 100e18}(1);

        assertEq(market.reserve(), 200e18);

        (uint256 yesPrice, uint256 noPrice) = market.getPrices();
        assertApproxEqAbs(yesPrice + noPrice, 1e18, 1);
    }

    function test_priceMovesOnBuy() public {
        vm.prank(alice);
        market.buyOutcome{value: 100e18}(0);
        vm.prank(bob);
        market.buyOutcome{value: 100e18}(1);

        (uint256 yesBefore, ) = market.getPrices();

        vm.prank(alice);
        market.buyOutcome{value: 50e18}(0);

        (uint256 yesAfter, ) = market.getPrices();
        assertGt(yesAfter, yesBefore);
    }

    function test_sellReturnsEth() public {
        vm.prank(alice);
        market.buyOutcome{value: 100e18}(0);

        uint256 balBefore = alice.balance;

        vm.prank(alice);
        market.sellOutcome(0, 50e18);

        uint256 balAfter = alice.balance;
        assertGt(balAfter, balBefore);
        assertEq(market.supplyYes(), 50e18);
    }

    function test_sellAllReturnsReserve() public {
        vm.prank(alice);
        market.buyOutcome{value: 100e18}(0);

        uint256 balBefore = alice.balance;

        vm.prank(alice);
        market.sellOutcome(0, 100e18);

        uint256 balAfter = alice.balance;
        assertApproxEqAbs(balAfter - balBefore, 100e18, 1);
        assertEq(market.reserve(), 0);
    }

    function test_resolveAndRedeem() public {
        vm.prank(alice);
        market.buyOutcome{value: 100e18}(0);

        vm.prank(bob);
        market.buyOutcome{value: 100e18}(1);

        uint256 totalReserve = market.reserve();

        vm.prank(oracle);
        market.resolve(0);

        assertTrue(market.resolved());
        assertEq(market.winningOutcome(), 0);

        uint256 balBefore = alice.balance;
        vm.prank(alice);
        market.redeem();

        uint256 payout = alice.balance - balBefore;
        assertEq(payout, totalReserve);
    }

    function test_multipleWinnersRedeem() public {
        vm.prank(alice);
        market.buyOutcome{value: 100e18}(0);

        vm.prank(bob);
        market.buyOutcome{value: 100e18}(0);

        vm.prank(alice);
        market.buyOutcome{value: 50e18}(1);

        uint256 totalReserve = market.reserve();

        vm.prank(oracle);
        market.resolve(0);

        uint256 aliceYes = market.balanceOf(alice, 0);
        uint256 bobYes = market.balanceOf(bob, 0);
        uint256 totalYes = market.supplyYes();

        vm.prank(alice);
        market.redeem();
        vm.prank(bob);
        market.redeem();

        uint256 alicePayout = (aliceYes * totalReserve) / totalYes;
        uint256 bobPayout = (bobYes * totalReserve) / totalYes;
        assertApproxEqAbs(alicePayout + bobPayout, totalReserve, 1);
    }

    function test_cannotBuyAfterResolution() public {
        vm.prank(alice);
        market.buyOutcome{value: 100e18}(0);

        vm.prank(oracle);
        market.resolve(0);

        vm.prank(bob);
        vm.expectRevert(SnackMarket.MarketAlreadyResolved.selector);
        market.buyOutcome{value: 100e18}(0);
    }

    function test_cannotSellAfterResolution() public {
        vm.prank(alice);
        market.buyOutcome{value: 100e18}(0);

        vm.prank(oracle);
        market.resolve(0);

        vm.prank(alice);
        vm.expectRevert(SnackMarket.MarketAlreadyResolved.selector);
        market.sellOutcome(0, 50e18);
    }

    function test_onlyOracleCanResolve() public {
        vm.prank(alice);
        market.buyOutcome{value: 100e18}(0);

        vm.prank(alice);
        vm.expectRevert(SnackMarket.OnlyOracle.selector);
        market.resolve(0);
    }

    function test_cannotRedeemBeforeResolution() public {
        vm.prank(alice);
        market.buyOutcome{value: 100e18}(0);

        vm.prank(alice);
        vm.expectRevert(SnackMarket.MarketNotResolved.selector);
        market.redeem();
    }

    function test_loserCannotRedeem() public {
        vm.prank(alice);
        market.buyOutcome{value: 100e18}(0);

        vm.prank(bob);
        market.buyOutcome{value: 100e18}(1);

        vm.prank(oracle);
        market.resolve(0);

        vm.prank(bob);
        vm.expectRevert(SnackMarket.NothingToRedeem.selector);
        market.redeem();
    }

    function test_previewBuy() public {
        vm.prank(alice);
        market.buyOutcome{value: 100e18}(0);

        uint256 preview = market.previewBuy(1, 50e18);
        assertGt(preview, 0);

        vm.prank(bob);
        market.buyOutcome{value: 50e18}(1);
        assertEq(market.balanceOf(bob, 1), preview);
    }

    function test_previewSell() public {
        vm.prank(alice);
        market.buyOutcome{value: 100e18}(0);

        uint256 preview = market.previewSell(0, 50e18);
        assertGt(preview, 0);

        uint256 balBefore = alice.balance;
        vm.prank(alice);
        market.sellOutcome(0, 50e18);
        assertEq(alice.balance - balBefore, preview);
    }

    function test_emptyMarketPrices() public view {
        (uint256 yesPrice, uint256 noPrice) = market.getPrices();
        assertEq(yesPrice, 0.5e18);
        assertEq(noPrice, 0.5e18);
    }
}
