// src/components/Navigation.js
import { useSelector, useDispatch } from "react-redux"
import Navbar from "react-bootstrap/Navbar"
import Form from "react-bootstrap/Form"
import Button from "react-bootstrap/Button"
import Badge from "react-bootstrap/Badge"
import Blockies from "react-blockies"

import logo from "../LeafSwapLogo_noTextNoEdge.png"
import { loadAccount } from "../store/interactions"
import {
  setNetwork,
  setUserConsented
} from "../store/reducers/providerSlice"

const NETWORKS = {
  31337: { name: "Localhost", hex: "0x7A69", badge: "success" },
  11155111: { name: "Sepolia", hex: "0xAA36A7", badge: "warning" },
}

export default function Navigation() {
  const dispatch = useDispatch()
  const chainId = useSelector(s => s.provider.chainId)
  const account = useSelector(s => s.provider.account)
  const userConsented = useSelector(s => s.provider.userConsented)

  const connectHandler = async () => {
    await loadAccount(dispatch)
  }

  const networkHandler = async (e) => {
    const targetHex = e.target.value
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: targetHex }],
      })
      // locally update right away for responsiveness
      const chain = parseInt(targetHex, 16)
      dispatch(setNetwork(chain))
    } catch (err) {
      console.warn("Switch network failed:", err)
    }
  }

  const current = NETWORKS[chainId]
  const selectedHex = current ? current.hex : "0"
  const badgeVariant = current?.badge || "secondary"
  const networkLabel = current ? `${current.name} (${chainId})` : (chainId ? `Unknown (${chainId})` : "No network")

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
        <Badge bg={badgeVariant} pill className="me-2">{current?.name || "Unknown"}</Badge>
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

          {/* Live network indicator — show "Connected: ..." only when wallet is connected */}
          {userConsented && account ? (
            <Form.Text muted className="me-3">
              Connected: {NETWORKS[chainId]?.name || `Chain ${chainId}`}
            </Form.Text>
          ) : (
            <Form.Text muted className="me-3">Not connected</Form.Text>
          )}

          {/* Connect / Account display */}
          {userConsented && account ? (
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
