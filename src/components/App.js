// src/components/App.js
import { useEffect } from "react"
import { useDispatch } from "react-redux"
import { HashRouter, Routes, Route } from "react-router-dom"
import { Container } from "react-bootstrap"
import Navigation from "./Navigation"
import Swap from "./Swap"
import { setAccount, setNetwork } from "../store/reducers/providerSlice"

export default function App() {
  const dispatch = useDispatch()

  useEffect(() => {
    if (!window.ethereum) return

    const onAccountsChanged = (accs) => {
      dispatch(setAccount(accs[0] ? accs[0] : null))
    }
    const onChainChanged = (hex) => {
      dispatch(setNetwork(parseInt(hex, 16)))
    }

    window.ethereum.on("accountsChanged", onAccountsChanged)
    window.ethereum.on("chainChanged", onChainChanged)

    // passive read (no popup): safe to run, but wrapped in try/catch just in case
    ;(async () => {
      try {
        const provider = new (await import("ethers")).ethers.providers.Web3Provider(window.ethereum)
        const [accs, net] = await Promise.all([
          provider.send("eth_accounts", []), // no popup
          provider.getNetwork()
        ])
        if (accs[0]) dispatch(setAccount(accs[0]))
        if (net?.chainId != null) dispatch(setNetwork(Number(net.chainId)))
      } catch {
        // ignore – render UI anyway
      }
    })()

    return () => {
      window.ethereum.removeListener("accountsChanged", onAccountsChanged)
      window.ethereum.removeListener("chainChanged", onChainChanged)
    }
  }, [dispatch])

  return (
    <Container>
      <HashRouter>
        <Navigation />
        <hr />
        <Routes>
          <Route path="/" element={<Swap />} />
        </Routes>
      </HashRouter>
    </Container>
  )
}
