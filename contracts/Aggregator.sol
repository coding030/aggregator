// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

interface IUniswapV2Pair {
    function getReserves() external view returns (
        uint112 reserve0,
        uint112 reserve1,
        uint32 blockTimestampLast
    );
    function token0() external view returns (address);
    function token1() external view returns (address);
}

interface IUniswapV2Factory {
    function getPair(address tokenA, address tokenB)
        external
        view
        returns (address pair);
}

contract Aggregator {
    constructor() {}

    /// @notice Find the pair address for two tokens on a given factory
    function findPair(
        address _factoryAddr,
        address _tokenA,
        address _tokenB
    )
        public
        view
        returns (address)
    {
        address pairAddr = IUniswapV2Factory(_factoryAddr).getPair(_tokenA, _tokenB);
        require(pairAddr != address(0), "Pair does not exist");
        return pairAddr;
    }

    /// @notice Get the price of tokenA in terms of tokenB (spot price, scaled to 1e18)
    function getPrice(
        address _factoryAddr,
        address _tokenA,
        address _tokenB
    )
        public
        view
        returns (uint256)
    {
        address pairAddr = IUniswapV2Factory(_factoryAddr).getPair(_tokenA, _tokenB);
        require(pairAddr != address(0), "Pair does not exist");

        IUniswapV2Pair pair = IUniswapV2Pair(pairAddr);
        (uint112 reserve0, uint112 reserve1,) = pair.getReserves();

        uint256 reserveA;
        uint256 reserveB;

        if (_tokenA == pair.token0() && _tokenB == pair.token1()) {
            reserveA = reserve0;
            reserveB = reserve1;
        } else if (_tokenA == pair.token1() && _tokenB == pair.token0()) {
            reserveA = reserve1;
            reserveB = reserve0;
        } else {
            revert("Token addresses do not match this pair");
        }

        require(reserveA > 0, "Reserve A is zero");
        return (uint256(reserveB) * 1e18) / uint256(reserveA);
    }

    /// @notice Simulate swap: how many tokenB you get for amountIn of tokenA
    /// @dev Uses UniswapV2 constant product formula with 0.3% fee
    function getAmountOut(
        address _factoryAddr,
        address _tokenA,
        address _tokenB,
        uint256 _amountIn
    )
        public
        view
        returns (uint256)
    {
        require(_amountIn > 0, "AmountIn must be > 0");

        address pairAddr = IUniswapV2Factory(_factoryAddr).getPair(_tokenA, _tokenB);
        require(pairAddr != address(0), "Pair does not exist");

        IUniswapV2Pair pair = IUniswapV2Pair(pairAddr);
        (uint112 reserve0, uint112 reserve1,) = pair.getReserves();

        uint256 reserveIn;
        uint256 reserveOut;

        if (_tokenA == pair.token0() && _tokenB == pair.token1()) {
            reserveIn = reserve0;
            reserveOut = reserve1;
        } else if (_tokenA == pair.token1() && _tokenB == pair.token0()) {
            reserveIn = reserve1;
            reserveOut = reserve0;
        } else {
            revert("Token addresses do not match this pair");
        }

        require(reserveIn > 0 && reserveOut > 0, "Invalid reserves");

        // Uniswap V2 formula with 0.3% fee
        uint256 amountInWithFee = _amountIn * 997;
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = reserveIn * 1000 + amountInWithFee;
        return numerator / denominator;
    }
}
