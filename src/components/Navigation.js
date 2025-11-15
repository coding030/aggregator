// src/components/Navigation.js
import { useSelector, useDispatch } from "react-redux"
import Navbar from "react-bootstrap/Navbar"
import Form from "react-bootstrap/Form"
import Button from "react-bootstrap/Button"
import Badge from "react-bootstrap/Badge"
import Blockies from "react-blockies"

import logo from "../LeafSwapLogo_noTextNoEdge.png"
import { loadAccount } from "../store/interactions"
import { setNetwork } from "../store/reducers/providerSlice"

const NETWORKS = {
  31337: { name: "Localhost", hex: "0x7A69",   badge: "success" },
  11155111: { name: "Sepolia",  hex: "0xAA36A7", badge: "warning" },
}

export default function Navigation() {
  const dispatch = useDispatch()

  const chainId = useSelector(s => s.provider.chainId)
  const account = useSelector(s => s.provider.account)

  const isConnected = !!account

  const connectHandler = async () => {
    if (!window.ethereum) {
      alert("MetaMask not detected")
      return
    }

    try {
      console.log("[LeafSwap] Connect button clicked")
      const acc = await loadAccount(dispatch)
      console.log("[LeafSwap] Connected account:", acc)
    } catch (err) {
      console.error("[LeafSwap] loadAccount error:", err)
    }
  }

  const networkHandler = async (e) => {
    const targetHex = e.target.value
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: targetHex }],
      })
      const chain = parseInt(targetHex, 16)
      dispatch(setNetwork(chain))
    } catch (err) {
      console.warn("[LeafSwap] Switch network failed:", err)
    }
  }

  const current = NETWORKS[chainId]
  const selectedHex = current ? current.hex : "0"
  const badgeVariant = current?.badge || "secondary"

  return (
    <Navbar className="my-3" expand="lg">
      <img
        alt="logo"
        src={logo}
        width="40"
        height="40"
        className="d-inline-block align-top mx-3"
      />
      <Navbar.Brand href="#">LeafSwap DEX Aggregator</Navbar.Brand>

      <div className="ms-3 d-flex align-items-center">
        <Badge bg={badgeVariant} pill className="me-2">
          {current?.name || "Unknown"}
        </Badge>
        <Form.Text muted>chainId: {chainId ?? "—"}</Form.Text>
      </div>

      <Navbar.Toggle aria-controls="nav" />
      <Navbar.Collapse id="nav" className="justify-content-end">
        <div className="d-flex justify-content-end align-items-center mt-3">
          {/* Network selector */}
          <Form.Select
            aria-label="Network Selector"
            value={selectedHex}
            onChange={networkHandler}
            style={{ maxWidth: "200px", marginRight: "20px" }}
          >
            <option value="0" disabled>Select Network</option>
            {Object.values(NETWORKS).map(net => (
              <option key={net.hex} value={net.hex}>
                {net.name}
              </option>
            ))}
          </Form.Select>

          {/* Live network indicator */}
          <Form.Text muted className="me-3">
            {isConnected && chainId
              ? `Connected: ${NETWORKS[chainId]?.name || `Chain ${chainId}`}`
              : "Not connected"}
          </Form.Text>

          {/* Connect / Account display */}
          {isConnected ? (
            <Navbar.Text className="d-flex align-items-center">
              {account.slice(0, 6)}...{account.slice(-4)}
              <Blockies
                seed={account}
                size={10}
                scale={3}
                color="#2187D0"
                bgColor="#F1F2F9"
                spotColor="767F92"
                className="identicon mx-2"
              />
            </Navbar.Text>
          ) : (
            <Button onClick={connectHandler}>Connect</Button>
          )}
        </div>
      </Navbar.Collapse>
    </Navbar>
  )
}
