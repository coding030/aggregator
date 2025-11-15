// scripts/get-weth.js
// Usage:
//   npx hardhat run scripts/get-weth.js --network localhost
//   AMOUNT=5 npx hardhat run scripts/get-weth.js --network localhost
//   AMOUNT=2 TO=0xYourMetaMaskAddr npx hardhat run scripts/get-weth.js --network localhost

const { ethers, network } = require("hardhat")

// Canonical mainnet WETH (works on a mainnet fork)
const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
const IWETH_ABI = [
  "function deposit() payable",
  "function balanceOf(address) view returns (uint256)"
]

async function main() {
  const [defaultSigner] = await ethers.getSigners()

  const to = process.env.TO || (await defaultSigner.getAddress())
  const amountEth = process.env.AMOUNT || "10" // default 10 ETH
  const amount = ethers.utils.parseEther(amountEth)

  const provider = ethers.provider
  const net = await provider.getNetwork()
  console.log(`⛓  Network: chainId=${net.chainId} (${network.name})`)
  console.log(`👤 Recipient: ${to}`)
  console.log(`💧 Amount: ${amountEth} ETH -> WETH`)
  console.log("")

  const weth = new ethers.Contract(WETH_ADDRESS, IWETH_ABI, defaultSigner)

  const before = await weth.balanceOf(to)
  console.log(`WETH before: ${ethers.utils.formatEther(before)} WETH`)

  if ((await defaultSigner.getAddress()).toLowerCase() === to.toLowerCase()) {
    // deposit directly from this signer to itself
    const tx = await weth.deposit({ value: amount })
    await tx.wait()
  } else {
    // deposit to the script signer, then you can transfer if you want:
    const tx = await weth.deposit({ value: amount })
    await tx.wait()

    // Optional: forward the WETH to recipient
    const ERC20 = new ethers.Contract(
      WETH_ADDRESS,
      ["function transfer(address,uint256) returns (bool)"],
      defaultSigner
    )
    const tx2 = await ERC20.transfer(to, amount)
    await tx2.wait()
  }

  const after = await weth.balanceOf(to)
  console.log(`WETH after:  ${ethers.utils.formatEther(after)} WETH`)
  console.log("✅ Done.")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
