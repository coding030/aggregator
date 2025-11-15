const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Aggregator (mainnet fork)", function () {
  let aggregator;

  const UNISWAP_V2_FACTORY = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";
// orig
//  const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
// new try
  const WETH = "0xC02aaA39b223FE8056F05b4cd0788d5ae0EE7563";
// orig
//  const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606e48";
// new try
  const USDC = "0xA0b86a33E6411E8AE2b7d2F1CCbbaBa37dB2e0f";

beforeEach(async function () {
    const Aggregator = await ethers.getContractFactory("Aggregator");
    aggregator = await Aggregator.deploy(UNISWAP_V2_FACTORY);
    await aggregator.deployed();

    const tx = await aggregator.setPair(WETH, USDC);
    await tx.wait();
    console.log("setPair tx mined:", tx.hash);

    const pairAddr = await aggregator.findPair(WETH, USDC);
    console.log("Pair address from findPair():", pairAddr);
  });

  it("should return a live price from Uniswap V2 WETH/USDC", async function () {
    const price = await aggregator.getPrice();
    console.log("WETH price in USDC:", ethers.utils.formatUnits(price, 18));
    expect(price).to.be.gt(0);
  });
});
