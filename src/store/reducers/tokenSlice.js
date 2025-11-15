// src/store/reducers/tokenSlice.js
import { createSlice } from "@reduxjs/toolkit"

const initialState = {
  tokenA: "WETH",
  tokenB: null,
  selectedDex: "Uniswap",
}

const tokenSlice = createSlice({
  name: "token",   // slice name (becomes "state.token")
  initialState,
  reducers: {
    setTokenA: (state, action) => {
      state.tokenA = action.payload
    },
    setTokenB: (state, action) => {
      state.tokenB = action.payload
    },
    setDex: (state, action) => {
      state.selectedDex = action.payload
    },
  },
})

export const {
  setTokenA,
  setTokenB,
  setDex
} = tokenSlice.actions
export default tokenSlice.reducer
