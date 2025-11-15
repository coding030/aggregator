import { ethers } from "ethers"
import {
  setProvider,
  setNetwork,
  setAccount,
  setAuthorized,
  setUserConsented
} from "./reducers/providerSlice"

// 1) Provider + network
export const loadProvider = (dispatch) => {
  const provider = new ethers.providers.Web3Provider(window.ethereum)
  dispatch(setProvider(provider))
  return provider
}

export const loadNetwork = async (provider, dispatch) => {
  const net = await provider.getNetwork()
  dispatch(setNetwork(Number(net.chainId)))
  return net.chainId
}

// 2) Passive account (no popup) – call on app mount
export const loadPassiveAccount = async (dispatch) => {
  if (!window.ethereum) return null
  const provider = new ethers.providers.Web3Provider(window.ethereum)
  const accounts = await provider.send("eth_accounts", []) // no popup

  if (accounts[0]) {
    dispatch(setAccount(ethers.utils.getAddress(accounts[0])))
    dispatch(setAuthorized(true))  // ✅ mark site as previously authorized
  } else {
    dispatch(setAuthorized(false))
  }

  return accounts[0] || null
}

// 3) Active connect (popup) – call on Connect button
export const loadAccount = async (dispatch) => {
  const accounts = await window.ethereum.request({ method: "eth_requestAccounts" })
  const account = ethers.utils.getAddress(accounts[0])
  dispatch(setAccount(account))
  dispatch(setUserConsented(true))  // mark explicit user action
  dispatch(setAuthorized(true))     // also mark as authorized now
  return account
}

// 4) Listeners (no reloads)
export const attachProviderListeners = (dispatch) => {
  if (!window.ethereum) return
  window.ethereum.on("accountsChanged", (accs) => {
    dispatch(setAccount(accs[0] ? ethers.utils.getAddress(accs[0]) : null))
    if (!accs[0]) {
      dispatch(setUserConsented(false))
      dispatch(setAuthorized(false))
    }
  })
  window.ethereum.on("chainChanged", (hex) => {
    dispatch(setNetwork(parseInt(hex, 16)))
    // DO NOT reload the page
  })
}
