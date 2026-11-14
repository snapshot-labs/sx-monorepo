// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.21;

import {Test, console2} from "forge-std/Test.sol";
import {Schnaps} from "../src/Schnaps.sol";
import {MockERC20} from "./MockERC20.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

contract SchnapsTest is Test {
    Schnaps public schnaps;
    address owner = address(0xbeef);
    uint256 amount = 100;
    address payable receiver = payable(address(1337));
    string barcode = "snapshot.box";
    IERC20 token;

    event PaymentReceived(address sender, address token, uint256 amount, string barcode);
    event Withdrawal(address receiver, address token, uint256 amount);

    error InsufficientBalance();
    error OwnableUnauthorizedAccount(address account);
    error ERC20InsufficientBalance(address sender, uint256 balance, uint256 needed);

    function setUp() public {
        schnaps = new Schnaps(owner);
        token = new MockERC20(amount);
        token.approve(address(schnaps), amount);
    }

    function test_payWithNativeToken() public {
        vm.expectEmit(true, true, true, true);
        emit PaymentReceived(address(this), address(0), amount, barcode);

        uint256 balance = address(this).balance;
        schnaps.payWithNativeToken{value: amount}(barcode);
        uint256 newBalance = address(this).balance;

        assertEq(balance - newBalance, amount);
    }

    function test_payWithERC20Token() public {
        vm.expectEmit(true, true, true, true);
        emit PaymentReceived(address(this), address(token), amount, barcode);

        schnaps.payWithERC20Token(token, amount, barcode);
        assertEq(token.balanceOf(address(this)), 0);
    }

    function test_withdrawNativeToken() public {
        schnaps.payWithNativeToken{value: amount}(barcode);

        vm.prank(owner);
        vm.expectEmit(true, true, true, true);
        emit Withdrawal(receiver, address(0), amount);
        schnaps.withdrawNativeToken(receiver, amount);
        assertEq(receiver.balance, amount);
        assertEq(address(schnaps).balance, 0);
    }

    function test_withdrawNativeTokenUnauthorized() public {
        schnaps.payWithNativeToken{value: amount}(barcode);

        vm.expectRevert(abi.encodeWithSelector(OwnableUnauthorizedAccount.selector, address(this)));
        schnaps.withdrawNativeToken(receiver, amount);
    }

    function test_withdrawNativeTokenTooMuch() public {
        schnaps.payWithNativeToken{value: amount}(barcode);

        vm.prank(owner);
        vm.expectRevert(InsufficientBalance.selector);
        schnaps.withdrawNativeToken(receiver, amount + 1);
    }

    function test_withdrawERC20Token() public {
        schnaps.payWithERC20Token(token, amount, barcode);

        vm.prank(owner);
        vm.expectEmit(true, true, true, true);
        emit Withdrawal(receiver, address(token), amount);
        schnaps.withdrawERC20Token(token, receiver, amount);

        assertEq(token.balanceOf(address(schnaps)), 0);
    }

    function test_withdrawERC20TokenUnauthorized() public {
        schnaps.payWithERC20Token(token, amount, barcode);

        vm.expectRevert(abi.encodeWithSelector(OwnableUnauthorizedAccount.selector, address(this)));
        schnaps.withdrawERC20Token(token, receiver, amount);
    }

    function test_withdrawERC20TokenTooMuch() public {
        schnaps.payWithERC20Token(token, amount, barcode);

        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(ERC20InsufficientBalance.selector, address(schnaps), amount, amount + 1));
        schnaps.withdrawERC20Token(token, receiver, amount + 1);
    }
}
