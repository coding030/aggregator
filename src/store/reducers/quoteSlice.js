// src/store/reducers/quoteSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit"
import { ethers } from "ethers"
import AGG_ABI from "../../abis/Aggregator.json"

const RPC_URL = process.env.REACT_APP_RPC_URL
const AGG_ADDR = process.env.REACT_APP_AGGREGATOR

const V2_DEXES = [
  { name: "UniswapV2",  factory: "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f" },
  { name: "SushiSwapV2",factory: "0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac" },
  { name: "ShibaSwap",  factory: "0x115934131916C8b277DD010Ee02de363c09d037c" },
  { name: "DefiSwap",   factory: "0x9055682E58C74fc8DdBFC55Ad2428aB1F96098Fc" },
  { name: "DODO",       factory: "0x1dEC1cE9e651b74B726c1B93063A1E42c9F9bEB1" },
  { name: "LuaSwap",    factory: "0x5f69C2ec01F787C963f8bC19d2451BfB3DdcF5D8" },
  { name: "ShibaNova",  factory: "0x9b208194acc0A8ccbF9009ccE480E54D5D826D68" }
]

export const getQuotes = createAsyncThunk(
  "quote/getQuotes",
  async ({ tokenIn, tokenOut, amountInWei }) => {
    if (!RPC_URL) throw new Error("Missing REACT_APP_RPC_URL")
    if (!AGG_ADDR) throw new Error("Missing REACT_APP_AGGREGATOR")

    const provider = new ethers.providers.JsonRpcProvider(RPC_URL)
    const agg = new ethers.Contract(AGG_ADDR, AGG_ABI, provider)

    let results = []

    for (const d of V2_DEXES) {
      try {
        // 1) quick existence check
        const pairAddr = await agg.findPair(d.factory, tokenIn, tokenOut)
        if (pairAddr === ethers.constants.AddressZero) continue

        // 2) amountOut quote (size-aware)
        const out = await agg.getAmountOut(d.factory, tokenIn, tokenOut, amountInWei)

        results.push({
          dex: d.name,
          factory: d.factory,
          pair: pairAddr,
          amountOut: out.toString(),
        })
      } catch (_) { /* skip if call fails */ }
    }

    // sort best first
    results.sort((a, b) =>
      ethers.BigNumber.from(b.amountOut).gt(a.amountOut) ? 1 : -1
    )

    // 3) enrich best with spot price + price impact
    if (results.length > 0) {
      try {
        const best = results[0]
        const price = await agg.getPrice(best.factory, tokenIn, tokenOut) // 1e18-scaled

        const spotOut = ethers.BigNumber
          .from(amountInWei)
          .mul(price)
          .div(ethers.constants.WeiPerEther)

        const actualOut = ethers.BigNumber.from(best.amountOut)

        const priceImpactBps = spotOut.isZero()
          ? "0"
          : spotOut.sub(actualOut).mul(10000).div(spotOut).toString()

        // attach to best result
        results[0] = {
          ...best,
          price: price.toString(),          // 1e18 scaled price (tokenIn -> tokenOut)
          spotOut: spotOut.toString(),      // expected out at mid price
          priceImpactBps                    // basis points (1% = 100 bps)
        }
      } catch (_) { /* ignore price enrich failures */ }
    }

    return results
  }
)

const quoteSlice = createSlice({
  name: "quote",
  initialState: { status: "idle", results: [], error: null },
  reducers: {},
  extraReducers: (b) => {
    b.addCase(getQuotes.pending, (s)=>{ s.status="loading"; s.error=null })
     .addCase(getQuotes.fulfilled,(s,a)=>{ s.status="ready"; s.results=a.payload })
     .addCase(getQuotes.rejected, (s,a)=>{ s.status="error"; s.error=a.error.message })
  },
})
export default quoteSlice.reducer
