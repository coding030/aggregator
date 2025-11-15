// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IERC20 {
  function transferFrom(address, address, uint) external returns (bool);
  function approve(address, uint) external returns (bool);
  function balanceOf(address) external view returns (uint);
}

interface IUniswapV2Router {
  function swapExactTokensForTokens(
    uint amountIn,
    uint amountOutMin,
    address[] calldata path,
    address to,
    uint deadline
  ) external returns (uint[] memory amounts);
}

contract AggregationRouter {
  error DeadlineExpired();
  error InsufficientOut();
  error ApproveFailed();
  error TransferFailed();

  // Optional: reentrancy guard
  uint256 private locked = 1;
  modifier nonReentrant() { require(locked == 1, "REENTRANCY"); locked = 2; _; locked = 1; }

  event SwapExecuted(
    address indexed user,
    address router,
    address[] path,
    uint256 amountIn,
    uint256 minOut,
    uint256 actualOut
  );

  /// @notice Execute a V2 swap on a chosen router using the exact path the UI locked.
  /// @dev User must approve this contract for path[0] beforehand (or use Permit2).
  function swapV2(
    address router,
    address[] calldata path,
    uint256 amountIn,
    uint256 minOut,
    address recipient,
    uint256 deadline
  ) external nonReentrant returns (uint256 actualOut) {
    if (block.timestamp > deadline) revert DeadlineExpired();

    // Pull tokens from user
    if (!IERC20(path[0]).transferFrom(msg.sender, address(this), amountIn)) revert TransferFailed();

    // Approve router (approve exact amount; clear after if you want)
    if (!IERC20(path[0]).approve(router, amountIn)) revert ApproveFailed();

    // Execute
    uint[] memory amounts = IUniswapV2Router(router).swapExactTokensForTokens(
      amountIn, minOut, path, recipient, deadline
    );
    actualOut = amounts[amounts.length - 1];
    if (actualOut < minOut) revert InsufficientOut();

    emit SwapExecuted(msg.sender, router, path, amountIn, minOut, actualOut);
  }
}
