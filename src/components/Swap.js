// src/components/Swap.js
import { useDispatch, useSelector } from "react-redux"
import { useEffect, useMemo, useState } from "react"
import Card from "react-bootstrap/Card"
import Form from "react-bootstrap/Form"
import InputGroup from "react-bootstrap/InputGroup"
import Dropdown from "react-bootstrap/Dropdown"
import DropdownButton from "react-bootstrap/DropdownButton"
import Button from "react-bootstrap/Button"
import Row from "react-bootstrap/Row"
import Spinner from "react-bootstrap/Spinner"
import Alert from "react-bootstrap/Alert"
import OverlayTrigger from "react-bootstrap/OverlayTrigger"
import Tooltip from "react-bootstrap/Tooltip"
import { ethers } from "ethers"

import { TOKENS } from "../config/tokens"
import { getQuotes } from "../store/reducers/quoteSlice"
import { executeSwap } from "../store/reducers/swapSlice"
import ERC20_ABI from "../abis/ERC20.json"

// --- small helpers for token logos ---
function TokenIcon({ src, alt, size = 18, className = "" }) {
  const onErr = (e) => { e.currentTarget.src = "/tokens/placeholder.png" }
  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      onError={onErr}
      style={{ borderRadius: 9999, objectFit: "cover" }}
      className={className}
    />
  )
}

function TokenLabel({ token }) {
  return (
    <span className="d-inline-flex align-items-center">
      <TokenIcon src={token.logo} alt={token.symbol} size={18} className="me-2" />
      <span style={{ lineHeight: 1 }}>
        <strong>{token.symbol}</strong>
        {token.name && (
          <span className="text-muted ms-1" style={{ fontSize: 12 }}>
            {token.name}
          </span>
        )}
      </span>
    </span>
  )
}

export default function Swap() {
  const dispatch = useDispatch()

  // provider state
  const account = useSelector(s => s.provider.account)
  const chainId = useSelector(s => s.provider.chainId)

  // quote + swap state
  const { status: quoteStatus, results, error: quoteError } = useSelector(s => s.quote)
  const { status: swapStatus, txHash, error: swapError } = useSelector(s => s.swap || { status: "idle" })

  // tokens & amount
  const [pair, setPair] = useState({ tokenIn: TOKENS[0], tokenOut: TOKENS[1] }) // WETH -> USDC
  const [amountIn, setAmountIn] = useState("1") // default "1" like 1inch

  // safe pickers (avoid same token both sides by swapping)
  const pickTokenIn = (t) => {
    setPair(prev =>
      t.address === prev.tokenOut.address
        ? { tokenIn: t, tokenOut: prev.tokenIn }
        : { ...prev, tokenIn: t }
    )
  }
  const pickTokenOut = (t) => {
    setPair(prev =>
      t.address === prev.tokenIn.address
        ? { tokenIn: prev.tokenOut, tokenOut: t }
        : { ...prev, tokenOut: t }
    )
  }

  // parse with correct decimals; be lenient while typing
  const amountInWei = useMemo(() => {
    if (amountIn === "" || amountIn === "." || !/^\d*\.?\d*$/.test(amountIn)) return null
    try { return ethers.utils.parseUnits(amountIn, pair.tokenIn.decimals).toString() }
    catch { return null }
  }, [amountIn, pair.tokenIn])

  const isZeroAmount = useMemo(() => {
    try { return !amountInWei || ethers.BigNumber.from(amountInWei).isZero() }
    catch { return true }
  }, [amountInWei])

  // ---- balance of tokenIn (to block approve/swap if insufficient) ----
  const [balanceIn, setBalanceIn] = useState(null) // BigNumber or null
  useEffect(() => {
    let cancelled = false
    async function loadBalance() {
      if (!account || !chainId) { setBalanceIn(null); return }
      try {
        const provider = new ethers.providers.Web3Provider(window.ethereum)
        const code = await provider.getCode(pair.tokenIn.address)
        if (code === "0x") {
          if (!cancelled) setBalanceIn(ethers.constants.Zero)
          return
        }

        const erc = new ethers.Contract(pair.tokenIn.address, ERC20_ABI, provider)
        const bal = await erc.balanceOf(account)
        if (!cancelled) setBalanceIn(bal)
      } catch {
        if (!cancelled) setBalanceIn(null)
      }
    }
    loadBalance()
    return () => { cancelled = true }
  }, [account, chainId, pair.tokenIn, swapStatus,])

  const amountTooHigh = useMemo(() => {
    if (!balanceIn || !amountInWei) return false
    try { return ethers.BigNumber.from(balanceIn).lt(amountInWei) } catch { return false }
  }, [balanceIn, amountInWei])

  // auto-quote (debounced) — quotes work without a wallet
  useEffect(() => {
    const t = setTimeout(() => {
      if (isZeroAmount) return
      dispatch(getQuotes({
        tokenIn: pair.tokenIn.address,
        tokenOut: pair.tokenOut.address,
        amountInWei
      }))
    }, 250)
    return () => clearTimeout(t)
  }, [dispatch, pair, amountInWei, isZeroAmount])

  const best = results?.[0] || null

  const formattedOut = useMemo(() => {
    if (!best) return ""
    return ethers.utils.formatUnits(best.amountOut, pair.tokenOut.decimals)
  }, [best, pair.tokenOut])

  // Only gate SWAP on connection & correct chain; quotes do NOT require connection
  const swapDisabled =
    !account ||
    chainId !== 31337 ||
    isZeroAmount ||
    amountTooHigh ||
    quoteStatus === "loading" ||
    !best ||
    swapStatus === "pending"

  const disabledReason = amountTooHigh ? `Insufficient ${pair.tokenIn.symbol} balance` : ""

  const onSwap = () => {
    if (!best || !amountInWei) return
    if (chainId !== 31337) {
      alert("Please switch MetaMask to Localhost (31337) to swap.")
      return
    }
    if (amountTooHigh) {
      return // tooltip already explains why it’s disabled
    }
    dispatch(executeSwap({
      best,
      tokenIn: pair.tokenIn,
      tokenOut: pair.tokenOut,
      amountInWei,
      // slippageBps: 50
    }))
  }

  return (
    <Card style={{ maxWidth: 520, marginTop: "80px" }} className="mx-auto px-4">
      <Form style={{ maxWidth: 520, margin: "30px auto" }}>
        {/* YOU PAY */}
        <Row className="my-3">
          <div className="d-flex justify-content-between">
            <Form.Label><strong>You pay</strong></Form.Label>
            <Form.Text muted>
              Balance:&nbsp;
              {balanceIn !== null
                ? `${ethers.utils.formatUnits(balanceIn, pair.tokenIn.decimals)} ${pair.tokenIn.symbol}`
                : (account ? "…" : "—")}
            </Form.Text>
          </div>

          <InputGroup>
            <Form.Control
              type="number"
              placeholder="0.0"
              min="0"
              step="any"
              value={amountIn}
              onChange={e => setAmountIn(e.target.value)}
            />
            <DropdownButton
              variant="outline-secondary"
              title={<TokenLabel token={pair.tokenIn} />}
            >
              {TOKENS.filter(t => t.address !== pair.tokenIn.address).map(t => (
                <Dropdown.Item key={t.address} onClick={() => pickTokenIn(t)}>
                  <TokenLabel token={t} />
                </Dropdown.Item>
              ))}
            </DropdownButton>
          </InputGroup>

          {/* 1 tokenIn ≈ X tokenOut line (guarded) */}
          <Form.Text muted className="mt-1">
            {best && !isZeroAmount && (() => {
              try {
                const oneIn = ethers.utils.parseUnits("1", pair.tokenIn.decimals)
                const denom = ethers.utils.parseUnits(amountIn || "1", pair.tokenIn.decimals)
                if (denom.isZero()) return null
                const perOneOut = oneIn.mul(best.amountOut).div(denom)
                return `1 ${pair.tokenIn.symbol} ≈ ${
                  ethers.utils.formatUnits(perOneOut, pair.tokenOut.decimals)
                } ${pair.tokenOut.symbol}`
              } catch { return null }
            })()}
          </Form.Text>
        </Row>

        {/* YOU RECIVE (as requested) */}
        <Row className="my-4">
          <div className="d-flex justify-content-between">
            <Form.Label><strong>You receive</strong></Form.Label>
          </div>
          <InputGroup>
            <Form.Control
              type="text"
              placeholder="0.0"
              value={formattedOut || ""}
              disabled
            />
            <DropdownButton
              variant="outline-secondary"
              title={<TokenLabel token={pair.tokenOut} />}
            >
              {TOKENS.filter(t => t.address !== pair.tokenOut.address).map(t => (
                <Dropdown.Item key={t.address} onClick={() => pickTokenOut(t)}>
                  <TokenLabel token={t} />
                </Dropdown.Item>
              ))}
            </DropdownButton>
          </InputGroup>
        </Row>

        {/* INFO + ACTIONS */}
        <Row className="my-3">
          {/* Quote state */}
          {quoteStatus === "loading" && (
            <Spinner animation="border" style={{ display: "block", margin: "0 auto" }} />
          )}

          {/* Best route + price impact */}
          {best && (
            <>
              <Form.Text muted className="mt-1">
                Best route: <strong>{best.dex}</strong>
              </Form.Text>
              {"priceImpactBps" in best && (
                <Form.Text muted className="mt-1">
                  Price impact: ~{(Number(best.priceImpactBps) / 100).toFixed(2)}%
                </Form.Text>
              )}
            </>
          )}

          {/* Errors */}
          {quoteError && <Alert variant="danger" className="mt-2 mb-0">Quote error: {quoteError}</Alert>}
          {swapError && <Alert variant="danger" className="mt-2 mb-0">Swap error: {swapError}</Alert>}
          {swapStatus === "success" && txHash && (
            <Alert variant="success" className="mt-2 mb-0">
              Swap successful — tx: {txHash.slice(0, 10)}…{txHash.slice(-8)}
            </Alert>
          )}

          {/* Action button / connect hint */}
          <div className="mt-3">
            {account ? (
              disabledReason && swapDisabled ? (
                <OverlayTrigger
                  placement="top"
                  delay={{ show: 200, hide: 50 }}
                  overlay={<Tooltip id="swap-tooltip">{disabledReason}</Tooltip>}
                >
                  <span className="d-block w-100">
                    <Button
                      type="button"
                      disabled
                      onClick={onSwap}
                      className="swap-btn w-100 pe-none"
                    >
                      {swapStatus === "pending" ? "Swapping…" : "Swap"}
                    </Button>
                  </span>
                </OverlayTrigger>
              ) : (
                <Button
                  type="button"
                  disabled={swapDisabled}
                  onClick={onSwap}
                  className="swap-btn w-100"
                >
                  {swapStatus === "pending" ? "Swapping…" : "Swap"}
                </Button>
              )
            ) : (
              <div className="text-center text-muted">
                Quotes update automatically. Connect wallet to swap.
              </div>
            )}
          </div>
        </Row>
      </Form>
    </Card>
  )
}
