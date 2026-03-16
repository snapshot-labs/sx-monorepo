// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../src/SnackFactory.sol";
import "../src/SnackMarket.sol";
import "../src/MockUSDC.sol";

contract SnackFactoryTest is Test {
    SnackFactory factory;
    MockUSDC usdc;
    address oracle = address(0xBEEF);
    address alice = address(0xA11CE);

    function setUp() public {
        usdc = new MockUSDC();
        factory = new SnackFactory(address(usdc), oracle);

        usdc.mint(alice, 10_000e6);
        vm.prank(alice);
        usdc.approve(address(factory), type(uint256).max);
    }

    function test_createMarket() public {
        address marketAddr = factory.createMarket("snapshot://s:aave.eth/proposal/0x123");
        assertTrue(marketAddr != address(0));

        address found = factory.getMarket("snapshot://s:aave.eth/proposal/0x123");
        assertEq(found, marketAddr);
    }

    function test_cannotCreateDuplicate() public {
        factory.createMarket("snapshot://s:aave.eth/proposal/0x123");

        vm.expectRevert(SnackFactory.MarketAlreadyExists.selector);
        factory.createMarket("snapshot://s:aave.eth/proposal/0x123");
    }

    function test_createAndBuy() public {
        vm.prank(alice);
        address marketAddr = factory.createAndBuy(
            "snapshot://s:aave.eth/proposal/0x456",
            0, // YES
            100e6
        );

        SnackMarket market = SnackMarket(marketAddr);
        assertEq(market.supplyYes(), 100e6);
        assertEq(market.reserve(), 100e6);
        assertEq(market.balanceOf(alice, 0), 100e6);
        assertEq(usdc.balanceOf(alice), 9_900e6);
    }

    function test_getMarketById() public {
        address marketAddr = factory.createMarket("snapshot://s:aave.eth/proposal/0x789");
        bytes32 refId = keccak256(abi.encodePacked("snapshot://s:aave.eth/proposal/0x789"));
        assertEq(factory.getMarketById(refId), marketAddr);
    }

    function test_getMarketNotFound() public view {
        address found = factory.getMarket("snapshot://nonexistent");
        assertEq(found, address(0));
    }

    function test_marketHasCorrectOracle() public {
        address marketAddr = factory.createMarket("snapshot://s:test.eth/proposal/0x1");
        SnackMarket market = SnackMarket(marketAddr);
        assertEq(market.oracle(), oracle);
    }

    function test_marketHasCorrectUsdc() public {
        address marketAddr = factory.createMarket("snapshot://s:test.eth/proposal/0x2");
        SnackMarket market = SnackMarket(marketAddr);
        assertEq(address(market.usdc()), address(usdc));
    }
}
