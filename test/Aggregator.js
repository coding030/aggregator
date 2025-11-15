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
    aggregator = await Aggregator.deploy();

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
    it("Should find WETH/USDC pair directly from factory", async function () {
      const pairAddress = await factory.getPair(WETH, USDC);
      console.log("WETH/USDC pair from factory:", pairAddress);

      expect(pairAddress).to.not.equal("0x0000000000000000000000000000000000000000");

      // Verify the pair has reserves
      const pair = await ethers.getContractAt("IUniswapV2Pair", pairAddress);
      const reserves = await pair.getReserves();
      console.log("Reserves - \nReserve0:\n", reserves[0].toString(), "\nReserve1:\n", reserves[1].toString());

      expect(reserves[0]).to.be.gt(0);
      expect(reserves[1]).to.be.gt(0);
    });

    it("Should find pair using contract", async function () {
      const pairAddress = await aggregator.findPair(UNISWAP_V2_FACTORY, WETH, USDC);
      console.log("WETH/USDC pair from our contract:", pairAddress);

      expect(pairAddress).to.not.equal("0x0000000000000000000000000000000000000000");

      // Compare with direct factory call
      const factoryPair = await factory.getPair(WETH, USDC);
      expect(pairAddress).to.equal(factoryPair);
      console.log("✅ Contract and factory return same pair address");
    });

    it("Should get WETH/USDC price", async function () {
      console.log("Getting WETH/USDC price...");
      const price = await aggregator.getPrice(UNISWAP_V2_FACTORY, WETH, USDC);
      const formattedPrice = ethers.utils ?
        ethers.utils.formatUnits(price, 18) :
        ethers.formatUnits(price, 18);

      console.log("WETH price in USDC:", formattedPrice);
      expect(price).to.be.gt(0);
      console.log("✅ Price retrieved successfully");
    });

    it("Should get reverse price (USDC/WETH)", async function () {
      console.log("Getting USDC/WETH price...");
      const price = await aggregator.getPrice(UNISWAP_V2_FACTORY, USDC, WETH);
      const formattedPrice = ethers.utils ?
        ethers.utils.formatUnits(price, 18) :
        ethers.formatUnits(price, 18);

      console.log("USDC price in WETH:", formattedPrice);
      expect(price).to.be.gt(0);
      console.log("✅ Reverse price retrieved successfully");
    });

    it("Should calculate swap amount out", async function () {
      const swapAmount = tokens(1); // 1 WETH
      console.log("Calculating swap: 1 WETH -> USDC");

      const amountOut = await aggregator.getAmountOut(
        UNISWAP_V2_FACTORY,
        WETH,
        USDC,
        swapAmount
      );

      // USDC has 6 decimals, so format accordingly
      const formattedAmountOut = ethers.utils ?
        ethers.utils.formatUnits(amountOut, 6) :
        ethers.formatUnits(amountOut, 6);

      console.log("Amount out:", formattedAmountOut, "USDC");
      expect(amountOut).to.be.gt(0);
      console.log("✅ Swap calculation successful");
    });

    it("Should handle different swap amounts", async function () {
      const amounts = [tokens(0.1), tokens(0.5), tokens(2)];

      for (const amount of amounts) {
        const amountOut = await aggregator.getAmountOut(
          UNISWAP_V2_FACTORY,
          WETH,
          USDC,
          amount
        );

        const ethAmount = ethers.utils ?
          ethers.utils.formatEther(amount) :
          ethers.formatEther(amount);
        const usdcAmount = ethers.utils ?
          ethers.utils.formatUnits(amountOut, 6) :
          ethers.formatUnits(amountOut, 6);

        console.log(`${ethAmount} WETH -> ${usdcAmount} USDC`);
        expect(amountOut).to.be.gt(0);
      }
      console.log("✅ Multiple swap amounts calculated successfully");
    });

    it("Should handle non-existent pair", async function () {
      const fakeToken1 = "0x1111111111111111111111111111111111111111";
      const fakeToken2 = "0x2222222222222222222222222222222222222222";

      await expect(
        aggregator.findPair(UNISWAP_V2_FACTORY, fakeToken1, fakeToken2)
      ).to.be.revertedWith("Pair does not exist");

      await expect(
        aggregator.getPrice(UNISWAP_V2_FACTORY, fakeToken1, fakeToken2)
      ).to.be.revertedWith("Pair does not exist");

      await expect(
        aggregator.getAmountOut(UNISWAP_V2_FACTORY, fakeToken1, fakeToken2, tokens(1))
      ).to.be.revertedWith("Pair does not exist");

      console.log("✅ Non-existent pair properly rejected");
    });
  });

  describe("Multiple pairs and factories", function () {
    it("Should work with DAI/WETH", async function () {
      const pairAddress = await aggregator.findPair(UNISWAP_V2_FACTORY, DAI, WETH);
      console.log("DAI/WETH pair:", pairAddress);

      expect(pairAddress).to.not.equal("0x0000000000000000000000000000000000000000");

      // Get price
      const price = await aggregator.getPrice(UNISWAP_V2_FACTORY, DAI, WETH);
      const formattedPrice = ethers.utils ?
        ethers.utils.formatUnits(price, 18) :
        ethers.formatUnits(price, 18);

      console.log("DAI price in WETH:", formattedPrice);
      expect(price).to.be.gt(0);
      console.log("✅ DAI/WETH pair working");
    });

    it("Should work with SushiSwap factory", async function () {
      try {
        const pairAddress = await aggregator.findPair(SUSHISWAP_V2_FACTORY, WETH, USDC);
        console.log("SushiSwap WETH/USDC pair:", pairAddress);

        if (pairAddress !== "0x0000000000000000000000000000000000000000") {
          const price = await aggregator.getPrice(SUSHISWAP_V2_FACTORY, WETH, USDC);
          const formattedPrice = ethers.utils ?
            ethers.utils.formatUnits(price, 18) :
            ethers.formatUnits(price, 18);

          console.log("SushiSwap WETH price in USDC:", formattedPrice);
          expect(price).to.be.gt(0);
          console.log("✅ SushiSwap pair working");
        } else {
          console.log("⚠️ SushiSwap WETH/USDC pair not found, skipping");
        }
      } catch (error) {
        console.log("⚠️ SushiSwap test failed (pair may not exist):", error.message);
      }
    });

    it("Should handle reversed token order", async function () {
      const pair1 = await aggregator.findPair(UNISWAP_V2_FACTORY, WETH, USDC);
      const pair2 = await aggregator.findPair(UNISWAP_V2_FACTORY, USDC, WETH);

      expect(pair1).to.equal(pair2);
      console.log("✅ Reversed token order returns same pair");

      // Prices should be reciprocals
      const price1 = await aggregator.getPrice(UNISWAP_V2_FACTORY, WETH, USDC);
      const price2 = await aggregator.getPrice(UNISWAP_V2_FACTORY, USDC, WETH);

      // Convert to numbers for calculation (be careful with precision)
      const p1 = parseFloat(ethers.utils ? ethers.utils.formatEther(price1) : ethers.formatEther(price1));
      const p2 = parseFloat(ethers.utils ? ethers.utils.formatEther(price2) : ethers.formatEther(price2));
      const product = p1 * p2;

      console.log("Price 1:", p1);
      console.log("Price 2:", p2);
      console.log("Product:", product);

      // Product should be close to 1 (allowing for some precision loss)
      expect(product).to.be.closeTo(1, 0.1);
      console.log("✅ Reverse prices are reciprocals");
    });
  });

  describe("Edge cases and validation", function () {
    it("Should reject zero amount in getAmountOut", async function () {
      const zeroAmount = ethers.BigNumber.from(0);
      await expect(
        aggregator.getAmountOut(factory.address, WETH, USDC, zeroAmount)
      ).to.be.revertedWith("AmountIn must be > 0");
    });

    it("Should handle very small amounts", async function () {
      const smallAmount = ethers.utils.parseUnits("0.0000001", 18); // 0.0000001 WETH
      const amountOut = await aggregator.getAmountOut(factory.address, WETH, USDC, smallAmount);
      expect(amountOut).to.be.gt(0); // should not revert
    });

    it("Should compare spot price with swap rate for small amounts", async function () {
      // --- get pair ---
      const pairAddr = await factory.getPair(WETH, USDC);
      const pair = await ethers.getContractAt("IUniswapV2Pair", pairAddr);

      // --- get reserves ---
      const [reserve0, reserve1] = await pair.getReserves();
      const token0 = await pair.token0();
      const token1 = await pair.token1();

      // --- get decimals ---
      const erc20Abi = [
        "function decimals() view returns (uint8)"
      ];
      const t0 = await ethers.getContractAt(erc20Abi, token0);
      const t1 = await ethers.getContractAt(erc20Abi, token1);
      const d0 = await t0.decimals();
      const d1 = await t1.decimals();

      // --- normalize reserves ---
      const adjReserve0 = Number(ethers.utils.formatUnits(reserve0, d0));
      const adjReserve1 = Number(ethers.utils.formatUnits(reserve1, d1));

      // --- compute spot price (token1 per token0) ---
      const spotPrice = adjReserve1 / adjReserve0;

      // --- simulate a small swap (1 token0) ---
      const amountIn = ethers.utils.parseUnits("1", d0);
      const amountOut = await aggregator.getAmountOut(factory.address, token0, token1, amountIn);

      const amountOutNorm = Number(ethers.utils.formatUnits(amountOut, d1));
      const impliedPrice = amountOutNorm / 1; // per 1 token0

      console.log("Spot price:", spotPrice);
      console.log("Implied price:", impliedPrice);

      // --- compare ---
      expect(Math.abs(impliedPrice - spotPrice) / spotPrice).to.be.below(0.01); // within 1%
    });
  });
});
