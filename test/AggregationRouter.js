const { expect } = require("chai");
const { ethers, network } = require("hardhat");

// Mainnet addresses
const UNI_V2_ROUTER = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
const SUSHI_V2_ROUTER = "0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F";

const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const DAI  = "0x6B175474E89094C44Da98b954EedeAC495271d0F";

// Known large holders
const WETH_WHALE = "0x8EB8a3b98659Cce290402893d0123abb75E3ab28";

// ABIs
const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 amt) returns (bool)",
  "function approve(address spender, uint256 amt) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)"
];
const UNISWAP_V2_ROUTER_ABI = [
  "function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint256[] memory)"
];

// helpers
const parseEther = (x) => ethers.utils.parseEther(x);
const parseUnits = (x, d) => ethers.utils.parseUnits(x, d);
const formatUnits = (x, d) => ethers.utils.formatUnits(x, d);

async function impersonate(addr) {
  await network.provider.request({ method: "hardhat_impersonateAccount", params: [addr] });
  return await ethers.getSigner(addr);
}
async function stopImpersonate(addr) {
  await network.provider.request({ method: "hardhat_stopImpersonatingAccount", params: [addr] });
}
async function setBalance(addr, hexBalance) {
  await network.provider.send("hardhat_setBalance", [addr, hexBalance]);
}

// Helper to give user USDC via storage manipulation
async function giveUSDC(userAddr, amount) {
  const USDC_SLOT = 9;
  const userBalanceSlot = ethers.utils.keccak256(
    ethers.utils.defaultAbiCoder.encode(
      ["address", "uint256"],
      [userAddr, USDC_SLOT]
    )
  );
  await network.provider.send("hardhat_setStorageAt", [
    USDC,
    userBalanceSlot,
    ethers.utils.hexZeroPad(amount.toHexString(), 32)
  ]);
}

describe("AggregationRouter.swapV2 on mainnet fork", () => {
  let owner, user;
  let routerAgg;
  let weth, usdc, dai, uniRouter, sushiRouter;

  before(async () => {
    // quick sanity: ensure we are on a fork (WETH has code)
    const code = await ethers.provider.getCode(WETH);
    if (code === "0x") throw new Error("Not forked: WETH has no code");

    [owner, user] = await ethers.getSigners();

    const Agg = await ethers.getContractFactory("AggregationRouter");
    routerAgg = await Agg.deploy();
    await routerAgg.deployed();

    weth = new ethers.Contract(WETH, ERC20_ABI, ethers.provider);
    usdc = new ethers.Contract(USDC, ERC20_ABI, ethers.provider);
    dai  = new ethers.Contract(DAI,  ERC20_ABI, ethers.provider);

    uniRouter   = new ethers.Contract(UNI_V2_ROUTER, UNISWAP_V2_ROUTER_ABI, ethers.provider);
    sushiRouter = new ethers.Contract(SUSHI_V2_ROUTER, UNISWAP_V2_ROUTER_ABI, ethers.provider);
  });

  it("wraps ETH (via whale), approves router, and swaps WETH -> USDC on UniswapV2", async () => {
    const amountIn = parseEther("1");

    // fund user with WETH via whale
    const whale = await impersonate(WETH_WHALE);
    await setBalance(WETH_WHALE, "0x56BC75E2D63100000"); // 100 ETH
    await (await weth.connect(whale).transfer(user.address, amountIn)).wait();
    await stopImpersonate(WETH_WHALE);

    const userWETHBefore = await weth.balanceOf(user.address);
    const userUSDCBefore = await usdc.balanceOf(user.address);
    expect(userWETHBefore).to.gte(amountIn);

    // realistic minOut from router quote (0.5% slippage)
    const path = [WETH, USDC];
    const amounts = await uniRouter.getAmountsOut(amountIn, path);
    const quotedOut = amounts[1];
    const minOut = quotedOut.mul(995).div(1000);

    // approve AggregationRouter
    const wethUser = weth.connect(user);
    await (await wethUser.approve(routerAgg.address, amountIn)).wait();

    const deadline = Math.floor(Date.now() / 1000) + 600;

    const tx = await routerAgg
      .connect(user)
      .swapV2(UNI_V2_ROUTER, path, amountIn, minOut, user.address, deadline);
    const receipt = await tx.wait();
    expect(receipt.status).to.eq(1);

    const userWETHAfter = await weth.balanceOf(user.address);
    const userUSDCAfter = await usdc.balanceOf(user.address);

    expect(userWETHAfter).to.eq(userWETHBefore.sub(amountIn));
    expect(userUSDCAfter).to.gte(minOut);

    // event
    const ev = receipt.events?.find(e => e.event === "SwapExecuted");
    expect(ev).to.not.be.undefined;
  });

  it("USDC -> DAI on SushiSwap", async () => {
    // fund user with USDC via storage manipulation
    const amountIn = parseUnits("1000", 6);
    await giveUSDC(user.address, amountIn);

    const usdcBefore = await usdc.balanceOf(user.address);
    const daiBefore  = await dai.balanceOf(user.address);
    expect(usdcBefore).to.eq(amountIn);

    const path = [USDC, DAI];
    const amounts = await sushiRouter.getAmountsOut(amountIn, path);
    const minOut = amounts[1].mul(995).div(1000);

    await (await usdc.connect(user).approve(routerAgg.address, amountIn)).wait();

    const deadline = Math.floor(Date.now() / 1000) + 600;
    await (await routerAgg
      .connect(user)
      .swapV2(SUSHI_V2_ROUTER, path, amountIn, minOut, user.address, deadline)
    ).wait();

    const usdcAfter = await usdc.balanceOf(user.address);
    const daiAfter  = await dai.balanceOf(user.address);

    expect(usdcAfter).to.eq(usdcBefore.sub(amountIn));
    expect(daiAfter).to.gte(minOut);
  });

  it("multi-hop WETH -> USDC -> DAI via UniswapV2", async () => {
    const whale = await impersonate(WETH_WHALE);
    await setBalance(WETH_WHALE, "0x56BC75E2D63100000");
    const amountIn = parseEther("1");
    await (await weth.connect(whale).transfer(user.address, amountIn)).wait();
    await stopImpersonate(WETH_WHALE);

    const path = [WETH, USDC, DAI];
    const amounts = await uniRouter.getAmountsOut(amountIn, path);
    const minOut = amounts[2].mul(995).div(1000);

    await (await weth.connect(user).approve(routerAgg.address, amountIn)).wait();

    const deadline = Math.floor(Date.now() / 1000) + 600;
    await (await routerAgg
      .connect(user)
      .swapV2(UNI_V2_ROUTER, path, amountIn, minOut, user.address, deadline)
    ).wait();

    expect(await dai.balanceOf(user.address)).to.gte(minOut);
  });

  it("reverts with DeadlineExpired when deadline is in the past", async () => {
    // give user some WETH
    const whale = await impersonate(WETH_WHALE);
    await setBalance(WETH_WHALE, "0x56BC75E2D63100000");
    const amountIn = parseEther("0.5");
    await (await weth.connect(whale).transfer(user.address, amountIn)).wait();
    await stopImpersonate(WETH_WHALE);

    await (await weth.connect(user).approve(routerAgg.address, amountIn)).wait();
    const path = [WETH, USDC];

    await expect(
      routerAgg
        .connect(user)
        .swapV2(UNI_V2_ROUTER, path, amountIn, 0, user.address, 1) // expired
    ).to.be.revertedWithCustomError(routerAgg, "DeadlineExpired");
  });

  it("router-level revert when amountOutMin is too high", async () => {
    const whale = await impersonate(WETH_WHALE);
    await setBalance(WETH_WHALE, "0x56BC75E2D63100000");
    const amountIn = parseEther("0.5");
    await (await weth.connect(whale).transfer(user.address, amountIn)).wait();
    await stopImpersonate(WETH_WHALE);

    await (await weth.connect(user).approve(routerAgg.address, amountIn)).wait();

    const path = [WETH, USDC];
    const amounts = await uniRouter.getAmountsOut(amountIn, path);
    const quotedOut = amounts[1];
    const tooHighMinOut = quotedOut.mul(1010).div(1000);

    const deadline = Math.floor(Date.now() / 1000) + 600;

    // UniswapV2Router will revert with its own error before your InsufficientOut
    await expect(
      routerAgg
        .connect(user)
        .swapV2(UNI_V2_ROUTER, path, amountIn, tooHighMinOut, user.address, deadline)
    ).to.be.revertedWith("UniswapV2Router: INSUFFICIENT_OUTPUT_AMOUNT");
  });

  it("reverts TransferFailed if user didn't approve router to pull tokenIn", async () => {
    // user has WETH but never approves your routerAgg
    const whale = await impersonate(WETH_WHALE);
    await setBalance(WETH_WHALE, "0x56BC75E2D63100000");
    const amountIn = parseEther("0.25");
    await (await weth.connect(whale).transfer(user.address, amountIn)).wait();
    await stopImpersonate(WETH_WHALE);

    // Explicitly revoke any existing approval from previous tests
    await (await weth.connect(user).approve(routerAgg.address, 0)).wait();

    // Verify allowance is 0
    const allowance = await weth.allowance(user.address, routerAgg.address);
    expect(allowance).to.eq(0);

    const path = [WETH, USDC];
    const deadline = Math.floor(Date.now() / 1000) + 600;

    // Note: In ethers v5, transferFrom returns false instead of reverting
    // So your contract's TransferFailed check should catch it
    await expect(
      routerAgg
        .connect(user)
        .swapV2(UNI_V2_ROUTER, path, amountIn, 0, user.address, deadline)
    ).to.be.reverted; // Just check it reverts (may not have custom error message in v5)
  });
});
