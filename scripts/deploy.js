// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  // Get suggested EIP-1559 fees from your forked node
  const fee = await ethers.provider.getFeeData();
  // fee = { maxFeePerGas, maxPriorityFeePerGas, gasPrice }

  const Aggregator = await ethers.getContractFactory("Aggregator");
  const agg = await Aggregator.deploy({
    maxFeePerGas: fee.maxFeePerGas,                 // e.g. ~2–5 gwei on fork
    maxPriorityFeePerGas: fee.maxPriorityFeePerGas, // usually ~1–2 gwei
  });
  await agg.deployed();

  console.log("Aggregator deployed to:", agg.address);

  const AggregationRouter = await ethers.getContractFactory("AggregationRouter");
  const aggRouter = await AggregationRouter.deploy({
    maxFeePerGas: fee.maxFeePerGas,                 // e.g. ~2–5 gwei on fork
    maxPriorityFeePerGas: fee.maxPriorityFeePerGas, // usually ~1–2 gwei
  });
  await aggRouter.deployed();

  console.log("AggregationRouter deployed to:", aggRouter.address);

}

main().catch((e) => { console.error(e); process.exit(1); });
