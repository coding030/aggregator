// src/store/reducers/swapSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit"
import { ethers } from "ethers"
import ERC20_ABI from "../../abis/ERC20.json"
import AGG_ROUTER_ABI from "../../abis/AggregationRouter.json"

// inline V2 router addresses (ETH mainnet; work on your fork)
const V2_ROUTERS = {
  UniswapV2:   "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
  SushiSwapV2: "0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F",
  // add more only if you also quote them and they’re V2-compatible on ETH mainnet
  ShibaSwap:   "0x03f7724180AA6b939894B5Ca4314783B0b36b329", // optional
}

const AGG_ROUTER_ADDR = process.env.REACT_APP_AGG_ROUTER

export const executeSwap = createAsyncThunk(
  "swap/execute",
  async ({ best, tokenIn, tokenOut, amountInWei, slippageBps = 50 }, { rejectWithValue }) => {
    try {
      if (!AGG_ROUTER_ADDR) throw new Error("Missing REACT_APP_AGG_ROUTER")
      if (!best) throw new Error("No best route")
      const dexRouter = V2_ROUTERS[best.dex]
      if (!dexRouter) throw new Error(`No router for ${best.dex}`)

      const provider = new ethers.providers.Web3Provider(window.ethereum)
      const signer = provider.getSigner()
      const account = await signer.getAddress()

      // 1) ensure allowance to *your AggregationRouter* (spender)
      const erc20 = new ethers.Contract(tokenIn.address, ERC20_ABI, signer)
      const allowance = await erc20.allowance(account, AGG_ROUTER_ADDR)
      if (allowance.lt(amountInWei)) {
        const approveTx = await erc20.approve(AGG_ROUTER_ADDR, amountInWei)
        await approveTx.wait()
      }

      // 2) slippage + deadline
      const quotedOut = ethers.BigNumber.from(best.amountOut)
      const minOut = quotedOut.mul(10000 - slippageBps).div(10000)
      const deadline = Math.floor(Date.now() / 1000) + 60 * 15

      // 3) call your AggregationRouter
      const agg = new ethers.Contract(AGG_ROUTER_ADDR, AGG_ROUTER_ABI, signer)
      const path = [tokenIn.address, tokenOut.address]

      const tx = await agg.swapV2(dexRouter, path, amountInWei, minOut, account, deadline)
      const receipt = await tx.wait()
      return { hash: receipt.transactionHash }
    } catch (e) {
      return rejectWithValue(e.message)
    }
  }
)

const slice = createSlice({
  name: "swap",
  initialState: { status: "idle", txHash: null, error: null },
  reducers: {},
  extraReducers: b => {
    b.addCase(executeSwap.pending,  s => { s.status = "pending"; s.error = null; s.txHash = null })
     .addCase(executeSwap.fulfilled, (s,a) => { s.status = "success"; s.txHash = a.payload.hash })
     .addCase(executeSwap.rejected,  (s,a) => { s.status = "error";   s.error = a.payload })
  }
})
export default slice.reducer
