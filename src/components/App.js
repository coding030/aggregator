// src/components/App.js
import { useEffect } from "react"
import { useDispatch } from "react-redux"
import { HashRouter, Routes, Route } from "react-router-dom"
import { Container } from "react-bootstrap"
import Navigation from "./Navigation"
import Swap from "./Swap"
import {
  loadProvider,
  loadNetwork,
  attachProviderListeners,
} from "../store/interactions"

export default function App() {
  const dispatch = useDispatch()

  useEffect(() => {
    const provider = loadProvider(dispatch)
    loadNetwork(provider, dispatch)
    attachProviderListeners(dispatch) // accounts/chain changed (no reloads)
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
