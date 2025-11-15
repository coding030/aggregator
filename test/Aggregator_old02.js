const { ethers } = require("hardhat");
const { expect } = require("chai");

const tokens = (n) => {
  return ethers.utils.parseUnits(n.toString(), 'ether')
}

describe("Optimized Aggregator Test", function () {
  let aggregator;
  let factory;

  // Ethereum Mainnet addresses
  const UNISWAP_V2_FACTORY = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";
  const UNISWAP_V3_FACTORY = "0x1F98431c8aD98523631AE4a59f267346ea31F984";
  const SUSHISWAP_V2_FACTORY = "0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac";
  const PANCAKESWAP_V2_FACTORY = "0x1097053Fd2ea711dad45caCcc45EfF7548fCB362";
  const PANCAKESWAP_V3_FACTORY = "0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac";
  const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
  const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
  const DAI = "0x6B175474E89094C44Da98b954EedeAC495271d0F";

  // Deploy once for all tests
  before(async function () {
    this.timeout(120000); // 2 minutes for deployment

    console.log("Deploying Aggregator contract...");
    const Aggregator = await ethers.getContractFactory("Aggregator");
    aggregator = await Aggregator.deploy(UNISWAP_V2_FACTORY);

    // Handle both ethers v5 and v6
    if (aggregator.deployed) {
      await aggregator.deployed();
      console.log("Contract deployed to:", aggregator.address);
    } else {
      await aggregator.waitForDeployment();
      console.log("Contract deployed to:", await aggregator.getAddress());
    }

    // Get factory contract for direct testing
    factory = await ethers.getContractAt("IUniswapV2Factory", UNISWAP_V2_FACTORY);
    console.log("Setup complete!");
  });

  describe("Basic functionality", function () {
    it("Should verify factory connection", async function () {
      const factoryAddress = await aggregator.factory();
      expect(factoryAddress).to.equal(UNISWAP_V2_FACTORY);
      console.log("✅ Factory connection verified");
    });

    it("Should find WETH/USDC pair directly from factory", async function () {
      const pairAddress = await factory.getPair(WETH, USDC);
      console.log("WETH/USDC pair from factory:", pairAddress);

      expect(pairAddress).to.not.equal("0x0000000000000000000000000000000000000000");

      // Verify the pair has reserves
      const pair = await ethers.getContractAt("IUniswapV2Pair", pairAddress);
      const reserves = await pair.getReserves();
//      console.log("Reserves - \nReserve0:\n", tokens(reserves[0]), "\nReserve1:\n", reserves[1].toString());
      console.log("Reserves - \nReserve0:\n", reserves[0].toString(), "\nReserve1:\n", reserves[1].toString());

      expect(reserves[0]).to.be.gt(0);
      expect(reserves[1]).to.be.gt(0);
    });

    it("Should find pair using contract", async function () {
      const pairAddress = await aggregator.findPair(WETH, USDC);
      console.log("WETH/USDC pair from our contract:", pairAddress);

      expect(pairAddress).to.not.equal("0x0000000000000000000000000000000000000000");

      // Compare with direct factory call
      const factoryPair = await factory.getPair(WETH, USDC);
      expect(pairAddress).to.equal(factoryPair);
      console.log("✅ Contract and factory return same pair address");
    });

    it("Should set pair and get price", async function () {
      console.log("Setting WETH/USDC pair...");
      const tx = await aggregator.setPair(WETH, USDC);
      await tx.wait();

      // Verify pair was set
      const setPairAddress = await aggregator.pair();
      const tokenA = await aggregator.tokenA();
      const tokenB = await aggregator.tokenB();

      console.log("Set pair address:", setPairAddress);
      console.log("TokenA:", tokenA);
      console.log("TokenB:", tokenB);

      expect(setPairAddress).to.not.equal("0x0000000000000000000000000000000000000000");
      expect(tokenA).to.equal(WETH);
      expect(tokenB).to.equal(USDC);

      // Get price
      console.log("Getting price...");
      const price = await aggregator.getPrice();
      const formattedPrice = ethers.utils ?
        ethers.utils.formatUnits(price, 18) :
        ethers.formatUnits(price, 18);

      console.log("WETH price in USDC:", formattedPrice);
      expect(price).to.be.gt(0);
      console.log("✅ Price retrieved successfully");
    });

    it("Should handle non-existent pair", async function () {
      const fakeToken1 = "0x1111111111111111111111111111111111111111";
      const fakeToken2 = "0x2222222222222222222222222222222222222222";

      await expect(
        aggregator.findPair(fakeToken1, fakeToken2)
      ).to.be.revertedWith("Pair does not exist");

      console.log("✅ Non-existent pair properly rejected");
    });
  });

  describe("Multiple pairs", function () {
    it("Should work with DAI/WETH", async function () {
      const pairAddress = await aggregator.findPair(DAI, WETH);
      console.log("DAI/WETH pair:", pairAddress);

      expect(pairAddress).to.not.equal("0x0000000000000000000000000000000000000000");

      // Set and get price
      const tx = await aggregator.setPair(DAI, WETH);
      await tx.wait();

      const price = await aggregator.getPrice();
      const formattedPrice = ethers.utils ?
        ethers.utils.formatUnits(price, 18) :
        ethers.formatUnits(price, 18);

      console.log("DAI price in WETH:", formattedPrice);
      expect(price).to.be.gt(0);
      console.log("✅ DAI/WETH pair working");
    });

    it("Should handle reversed token order", async function () {
      const pair1 = await aggregator.findPair(WETH, USDC);
      const pair2 = await aggregator.findPair(USDC, WETH);

      expect(pair1).to.equal(pair2);
      console.log("✅ Reversed token order returns same pair");
    });
  });
});
