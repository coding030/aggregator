import { createSlice } from "@reduxjs/toolkit"
import { ethers } from "ethers"

const initialState = {
  account: null,
  chainId: null
}

const slice = createSlice({
  name: "provider",
  initialState: {
    connection: null,     // ethers Web3Provider (window.ethereum)
    chainId: null,        // number (e.g. 31337)
    account: null,        // checksummed address or null
    isAuthorized: false,  // MetaMask has granted access before (eth_accounts returned something)
    userConsented: false  // user clicked "Connect" in this session
  },
reducers: {
    setProvider: (state, action) => {
      state.connection = action.payload || null
    },
    setNetwork: (state, action) => {
      state.chainId = action.payload ?? null
    },
    setAccount: (state, action) => {
      state.account = action.payload || null
    },
    // set when eth_accounts returns a wallet (no popup)
    setAuthorized: (state, action) => {
      state.isAuthorized = !!action.payload
    },
    // set true only after user clicks Connect (eth_requestAccounts)
    setUserConsented: (state, action) => {
      state.userConsented = !!action.payload
    },
    // Optional helper: clear consent when user disconnects in MetaMask
    resetConsent: (state) => {
      state.userConsented = false
    }
  }
})

export const {
  setProvider,
  setNetwork,
  setAccount,
  setAuthorized,
  setUserConsented,
  resetConsent
} = slice.actions

export default slice.reducer
