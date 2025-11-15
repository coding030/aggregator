const { ethers } = require("hardhat");
const { expect } = require("chai");

describe("Aggregator Contract", () => {
  let aggregator;
  let accounts;

  // Mainnet addresses (with correct checksums)
  const UNISWAP_V2_FACTORY = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";
  const WETH = "0xC02aaA39b223FE8d0A0e5C4F27eAD9083C756Cc2";  // WETH mainnet
  const USDC = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";  // USDC mainnet
  const DAI = "0x6B175474E89094C44Da98b954EedeAC495271d0F";   // DAI mainnet
  const WBTC = "0x2260FAC5E5542a8EdC3b6a3F7FDF4c54E5B5d7c8";  // WBTC mainnet

  beforeEach(async () => {
    account = await ethers.getSigners();
    console.log("Signers")

    // Deploy the Aggregator contract
    const Aggregator = await ethers.getContractFactory("Aggregator");
    aggregator = await Aggregator.deploy(UNISWAP_V2_FACTORY);
    await aggregator.deployed();

    console.log("Aggregator deployed to:", aggregator.address);
  });

  describe("findPair function", function () {
    it("Should find existing WETH/USDC pair", async function () {
      const pairAddress = await aggregator.findPair(WETH, USDC);
      console.log("WETH/USDC pair address:", pairAddress);

      expect(pairAddress).to.not.equal("0x0000000000000000000000000000000000000000");
      expect(pairAddress).to.not.equal(ethers.constants.AddressZero);
    });

    it("Should find existing WETH/DAI pair", async function () {
      const pairAddress = await aggregator.findPair(WETH, DAI);
      console.log("WETH/DAI pair address:", pairAddress);

      expect(pairAddress).to.not.equal(ethers.constants.AddressZero);
    });

    it("Should revert for non-existent pair", async function () {
      // Using two addresses that likely don't have a pair
      const fakeToken1 = "0x1111111111111111111111111111111111111111";
      const fakeToken2 = "0x2222222222222222222222222222222222222222";

      await expect(
        aggregator.findPair(fakeToken1, fakeToken2)
      ).to.be.revertedWith("Pair does not exist");
    });

    it("Should work with reversed token order", async function () {
      const pair1 = await aggregator.findPair(WETH, USDC);
      const pair2 = await aggregator.findPair(USDC, WETH);

      console.log("WETH/USDC:", pair1);
      console.log("USDC/WETH:", pair2);

      // Should return the same pair address regardless of order
      expect(pair1).to.equal(pair2);
    });
  });

  describe("setPair and getPrice functions", function () {
    it("Should set pair and get price for WETH/USDC", async function () {
      // Set the pair
      await aggregator.setPair(WETH, USDC);

      // Check that pair was set correctly
      const pairAddress = await aggregator.pair();
      const tokenA = await aggregator.tokenA();
      const tokenB = await aggregator.tokenB();

      expect(pairAddress).to.not.equal(ethers.constants.AddressZero);
      expect(tokenA).to.equal(WETH);
      expect(tokenB).to.equal(USDC);

      console.log("Set pair address:", pairAddress);
      console.log("TokenA (WETH):", tokenA);
      console.log("TokenB (USDC):", tokenB);

      // Get price
      const price = await aggregator.getPrice();
      console.log("WETH price in USDC (scaled to 18 decimals):", ethers.utils.formatUnits(price, 18));

      expect(price).to.be.gt(0);
    });

    it("Should set pair and get price for DAI/WETH", async function () {
      await aggregator.setPair(DAI, WETH);

      const price = await aggregator.getPrice();
      console.log("DAI price in WETH (scaled to 18 decimals):", ethers.utils.formatUnits(price, 18));

      expect(price).to.be.gt(0);
    });

    it("Should revert getPrice when pair is not set", async function () {
      await expect(
        aggregator.getPrice()
      ).to.be.revertedWith("Pair not set");
    });
  });

  describe("Integration test with real pair data", function () {
    it("Should get reserves and verify pair tokens", async function () {
      // Set WETH/USDC pair
      await aggregator.setPair(WETH, USDC);

      const pairAddress = await aggregator.pair();

      // Create pair contract instance to verify data
      const pairContract = await ethers.getContractAt("IUniswapV2Pair", pairAddress);

      const reserves = await pairContract.getReserves();
      const token0 = await pairContract.token0();
      const token1 = await pairContract.token1();

      console.log("Pair reserves:", {
        reserve0: ethers.utils.formatUnits(reserves[0], 18),
        reserve1: ethers.utils.formatUnits(reserves[1], 6), // USDC has 6 decimals
        blockTimestamp: reserves[2]
      });

      console.log("Pair tokens:", { token0, token1 });
      console.log("Our tokens:", { tokenA: WETH, tokenB: USDC });

      expect(reserves[0]).to.be.gt(0);
      expect(reserves[1]).to.be.gt(0);
      expect([token0, token1]).to.include(WETH);
      expect([token0, token1]).to.include(USDC);
    });
  });
});
