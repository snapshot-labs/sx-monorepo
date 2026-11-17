// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import {Ownable} from "openzeppelin-contracts/contracts/access/Ownable.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title Schnaps Payment Receiver
/// @notice A contract that allows the receival of payments via the chain's native token as well as arbitrary ERC20 tokens.
///         Each payment is referenced by a barcode, which is an arbitrary byte array.
/// @dev The contract does not perform any checks on the payment validity. This must be done off-chain using the emitted event data.
contract Schnaps is Ownable {
    using SafeERC20 for IERC20;

    /// @notice Emitted when a payment is received.
    /// @param  sender The address of the sender.
    /// @param  token The address of the token used for payment.
    ///               It will be set to the zero address if the native token of the chain is used.
    /// @param  amount The amount of the token used for payment.
    /// @param  barcode The barcode of the payment.
    event PaymentReceived(address sender, address token, uint256 amount, string barcode);

    /// @notice Emitted when a withdrawal occurs.
    /// @param  recipient The address of the recipient of the withdrawal.
    /// @param  token The address of the token withdrawn.
    ///               It will be set to the zero address if the native token of the chain is used.
    /// @param  amount The amount of the token withdrawn.
    event Withdrawal(address recipient, address token, uint256 amount);

    /// @notice Thrown when the contract does not have a sufficient native token balance to perform a withdrawal.
    error InsufficientBalance();

    /// @dev Constructor.
    constructor(address initialOwner) Ownable(initialOwner) {}

    /// @notice Makes a payment using the native token of the chain.
    /// @param barcode The barcode of the payment.
    function payWithNativeToken(string calldata barcode) external payable {
        emit PaymentReceived(msg.sender, address(0), msg.value, barcode);
    }

    /// @notice Makes a payment using an ERC20 token.
    /// @param token The address of the token.
    /// @param amount The amount of the token.
    /// @param barcode The barcode of the payment.
    function payWithERC20Token(IERC20 token, uint256 amount, string calldata barcode) external {
        token.safeTransferFrom(msg.sender, address(this), amount);
        emit PaymentReceived(msg.sender, address(token), amount, barcode);
    }

    /// @notice Withdraws native tokens from the contract.
    /// @param recipient The address of the recipient of the withdrawal.
    /// @param amount The amount of the native token to withdraw.
    function withdrawNativeToken(address payable recipient, uint256 amount) external onlyOwner {
        if (amount > address(this).balance) {
            revert InsufficientBalance();
        }
        recipient.transfer(amount);
        emit Withdrawal(recipient, address(0), amount);
    }

    /// @notice Withdraws ERC20 tokens from the contract.
    /// @param token The address of the token.
    /// @param recipient The address of the recipient of the withdrawal.
    /// @param amount The amount of the token to withdraw.
    function withdrawERC20Token(IERC20 token, address recipient, uint256 amount) external onlyOwner {
        token.safeTransfer(recipient, amount);
        emit Withdrawal(recipient, address(token), amount);
    }
}
