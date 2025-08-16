//SPDX-License-Identifier: Unlicense
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

// import "hardhat/console.sol";

contract Aggreagtor {
    IUniswapV2Pair public pair;
    IUniswapV2Factory public factory;
    address public tokenA;
    address public tokenB;

    constructor(address factoryAddress) {
        factory = IUniswapV2Factory(factoryAddress);
    }

    function findPair(address _tokenA, address _tokenB) public view returns (IUniswapV2Pair) {
        address pairAddr = factory.getPair(_tokenA, _tokenB);
        require(pairAddr != address(0), "Pair does not exist");
        return IUniswapV2Pair(pairAddr);
    }

    function getPrice() public view returns (uint256) {
        (uint112 reserve0, uint112 reserve1,) = pair.getReserves();

        uint256 reserveA;
        uint256 reserveB;

        // Determine which reserve corresponds to tokenA and tokenB
        if (tokenA == pair.token0() && tokenB == pair.token1()) {
            reserveA = reserve0;
            reserveB = reserve1;
        } else if (tokenA == pair.token1() && tokenB == pair.token0()) {
            reserveA = reserve1;
            reserveB = reserve0;
        } else {
            revert("Token addresses do not match this pair");
        }

        // Price of tokenA in terms of tokenB (scaled to 18 decimals)
        return (uint256(reserveB) * 1e18) / uint256(reserveA);
    }
}
