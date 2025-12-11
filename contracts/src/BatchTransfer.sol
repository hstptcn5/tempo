// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title BatchTransfer
 * @notice Batch transfer TIP-20/ERC-20 tokens to multiple recipients in a single transaction
 * @dev Requires users to approve this contract before calling batch functions
 * 
 * Features:
 * - batchTransfer: Basic batch transfer without memos
 * - batchTransferWithMemo: Batch transfer with TIP-20 memos (bytes32)
 * - All-or-nothing: If any transfer fails, entire batch reverts
 * 
 * Usage:
 * 1. User calls token.approve(batchTransfer, totalAmount)
 * 2. User calls batchTransfer.batchTransfer(token, recipients, amounts)
 * 
 * @author HST Web3 Stack
 */

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
}

interface ITIP20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transferWithMemo(address to, uint256 amount, bytes32 memo) external;
}

contract BatchTransfer {
    // Events
    event BatchTransferExecuted(
        address indexed sender,
        address indexed token,
        uint256 recipientCount,
        uint256 totalAmount
    );
    
    event BatchTransferWithMemoExecuted(
        address indexed sender,
        address indexed token,
        uint256 recipientCount,
        uint256 totalAmount
    );

    // Errors
    error LengthMismatch();
    error EmptyBatch();
    error TransferFailed(uint256 index, address recipient);
    error InsufficientAllowance(uint256 required, uint256 actual);
    error ZeroAddress();
    error ZeroAmount();

    /**
     * @notice Batch transfer tokens to multiple recipients
     * @param token The token contract address
     * @param recipients Array of recipient addresses
     * @param amounts Array of amounts to send to each recipient
     */
    function batchTransfer(
        address token,
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external {
        if (recipients.length != amounts.length) revert LengthMismatch();
        if (recipients.length == 0) revert EmptyBatch();

        uint256 totalAmount = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            totalAmount += amounts[i];
        }

        // Check allowance upfront
        uint256 allowance = IERC20(token).allowance(msg.sender, address(this));
        if (allowance < totalAmount) {
            revert InsufficientAllowance(totalAmount, allowance);
        }

        // Execute transfers
        for (uint256 i = 0; i < recipients.length; i++) {
            if (recipients[i] == address(0)) revert ZeroAddress();
            if (amounts[i] == 0) revert ZeroAmount();
            
            bool success = IERC20(token).transferFrom(
                msg.sender,
                recipients[i],
                amounts[i]
            );
            if (!success) revert TransferFailed(i, recipients[i]);
        }

        emit BatchTransferExecuted(msg.sender, token, recipients.length, totalAmount);
    }

    /**
     * @notice Batch transfer TIP-20 tokens with memos
     * @dev Uses transferWithMemo for TIP-20 tokens. Requires approval first.
     * @param token The TIP-20 token contract address
     * @param recipients Array of recipient addresses
     * @param amounts Array of amounts to send to each recipient
     * @param memos Array of bytes32 memos for each transfer
     */
    function batchTransferWithMemo(
        address token,
        address[] calldata recipients,
        uint256[] calldata amounts,
        bytes32[] calldata memos
    ) external {
        if (recipients.length != amounts.length) revert LengthMismatch();
        if (recipients.length != memos.length) revert LengthMismatch();
        if (recipients.length == 0) revert EmptyBatch();

        uint256 totalAmount = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            totalAmount += amounts[i];
        }

        // Check allowance upfront
        uint256 allowance = IERC20(token).allowance(msg.sender, address(this));
        if (allowance < totalAmount) {
            revert InsufficientAllowance(totalAmount, allowance);
        }

        // First, transfer all tokens to this contract
        bool pullSuccess = IERC20(token).transferFrom(msg.sender, address(this), totalAmount);
        if (!pullSuccess) revert TransferFailed(0, address(this));

        // Then, send to each recipient with memo
        // Note: This requires this contract to call transferWithMemo
        // which means the token must allow this contract as a sender
        for (uint256 i = 0; i < recipients.length; i++) {
            if (recipients[i] == address(0)) revert ZeroAddress();
            if (amounts[i] == 0) revert ZeroAmount();
            
            // Call transferWithMemo on the token
            // This will transfer from this contract to the recipient
            try ITIP20(token).transferWithMemo(recipients[i], amounts[i], memos[i]) {
                // Success
            } catch {
                revert TransferFailed(i, recipients[i]);
            }
        }

        emit BatchTransferWithMemoExecuted(msg.sender, token, recipients.length, totalAmount);
    }

    /**
     * @notice Batch transfer with individual transferFrom calls (alternative approach)
     * @dev This version doesn't use memos but preserves msg.sender context issue
     * @param token The token contract address  
     * @param recipients Array of recipient addresses
     * @param amounts Array of amounts to send to each recipient
     */
    function batchTransferSimple(
        address token,
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external {
        if (recipients.length != amounts.length) revert LengthMismatch();
        if (recipients.length == 0) revert EmptyBatch();

        uint256 totalAmount = 0;
        
        for (uint256 i = 0; i < recipients.length; i++) {
            if (recipients[i] == address(0)) revert ZeroAddress();
            if (amounts[i] == 0) revert ZeroAmount();
            
            totalAmount += amounts[i];
            
            bool success = IERC20(token).transferFrom(
                msg.sender,
                recipients[i],
                amounts[i]
            );
            if (!success) revert TransferFailed(i, recipients[i]);
        }

        emit BatchTransferExecuted(msg.sender, token, recipients.length, totalAmount);
    }

    /**
     * @notice Calculate total amount needed for a batch
     * @param amounts Array of amounts
     * @return total Total amount
     */
    function calculateTotal(uint256[] calldata amounts) external pure returns (uint256 total) {
        for (uint256 i = 0; i < amounts.length; i++) {
            total += amounts[i];
        }
    }

    /**
     * @notice Check if user has sufficient allowance for batch
     * @param token Token address
     * @param user User address
     * @param amounts Array of amounts
     * @return sufficient Whether allowance is sufficient
     * @return required Total required amount
     * @return actual Current allowance
     */
    function checkAllowance(
        address token,
        address user,
        uint256[] calldata amounts
    ) external view returns (bool sufficient, uint256 required, uint256 actual) {
        for (uint256 i = 0; i < amounts.length; i++) {
            required += amounts[i];
        }
        actual = IERC20(token).allowance(user, address(this));
        sufficient = actual >= required;
    }
}



