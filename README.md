# How to LeafSwap

Welcome to my LeafSwap Dex Aggregator Project. The project shows how a DEX aggregator works internally, i.e. pair discovery, routing, price impact, UI/UX, wallet state and swap execution. It consists of:

- Solidity smart contracts (Aggregator + AggregationRouter)
- Hardhat mainnet-fork backend
- React + Redux Toolkit frontend
- Token logo system, live quoting, price-impact calculations
- Fully working swap execution
- Network-aware UI (Localhost 31337 / Sepolia)

## Installation & Setup

Clone the repo and install dependencies:

```shell
git clone https://github.com/<your-username>/<your-repo>.git
cd <your-repo>
npm install
```

Create an .env file:

```shell
ALCHEMY_API_KEYS=your_alchemy_key
REACT_APP_RPC_URL=http://127.0.0.1:8545
REACT_APP_AGGREGATOR=0xYourAggregatorAddressAfterDeployment
REACT_APP_AGG_ROUTER=0xYourAggregationRouterAddressAfterDeployment
```

An example file is included as .env.example.

## Start the Hardhat Mainnet Fork

Requires an Alchemy key. Run the local blockchain on a fork of the mainnet:

```shell
npx hardhat node
```

The fork is configured in hardhat.config.js:

```shell
      forking: {
        url: `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEYS}`,
        blockNumber: 23111456,
      },
```

## Deploy Contracts

The dex aggregator consists of two smart contracts: The Aggregator smart contract finds best V2 pairs from any factory (Uniswap, SushiSwap, ShibaSwap, etc.) and calculates price quotes:
- getPrice() (mid price)
- getAmountOut() (swap simulation)
- Price-impact calculation

The Router smart contract executes the swaps through any Uniswap-V2-compatible router and supports both direct and multi-hop swaps.

To deploy both contracts, run a second terminal:

```shell
npx hardhat run scripts/deploy.js --network localhost
```

You will get:

- Aggregator address
- AggregationRouter address

Copy both into your .env.

## Get WETH for local testing

get-weth.js is a utility script that gives your local Hardhat account wrapped ETH (WETH) when you are running a mainnet fork.

On mainnet, ETH itself is not an ERC-20 token. To trade ETH on Uniswap/Sushiswap pairs, you must convert ETH → WETH. A script is provided to mint WETH. The script loads the real WETH ABI and address from Ethereum mainnet, and by default sends normal ETH to the WETH contract from Hardhat account #0 and WETH is minted to the sender's address (Hardhat account #0).

Run the script:

```shell
npx hardhat run scripts/get-weth.js --network localhost
```

This sends 10 WETH to the first Hardhat account.
For custom amount / recipient (e.g., your MetaMask address on 31337) run:

```shell
AMOUNT=5 TO=0xYourMetaMaskAddr npx hardhat run scripts/get-weth.js --network localhost
```

## Start the Frontend

```shell
npm start
```

The app runs on:

http://localhost:3000/


### React Frontend Features

- Token logos visible everywhere
- YOU PAY / YOU RECEIVE formatting
- Live, auto-refreshing quotes (debounced)
- Best route identification
- Price impact indicator
- Token balance tracking
- Fully functional swap button
- Better UX for errors & insufficient balances

### Wallet + Provider system

- Wallet connect/disconnect
- Network switch UI
- Metamask chain sync
- Redux slices for provider / quotes / swaps


## Using the App

### Connect your wallet

Click Connect at top-right. 
(For tips and tricks about MetaMask, see below.)

### Choose network

Select:

- Localhost (31337) — needed for swaps
- Sepolia — currently only for showing balances (no swaps)

### Select tokens

Choose tokenIn and tokenOut from dropdowns.

### Enter an amount

- Price quote updates automatically
- Best route shown (UniswapV2, SushiSwap, etc.)
- Price impact computed from mid-price

### Swap

Click Swap (enabled only on Localhost 31337).
Your trade executes via AggregationRouter, and:

- Balance updates
- Success message appears
- Transaction hash shown

## MetaMask

### Add the Localhost Fork Network

To allow MetaMask to connect to your forked Hardhat node, add a custom network:

MetaMask → Networks → Add Network → Add a Network Manually

Fill in the following information:

- Name: Hardhat (or any name you prefer)
- New RPC URL: http://127.0.0.1:8545
- Chain ID: 31337
- Symbol: ETH
- Block Explorer: (leave empty)

Click save.

### Add ERC-20 Tokens

To see token balances in MetaMask, you must import the token addresses for the Hardhat (31337) network.

Go to:

MetaMask → Import Tokens → Custom Token

Now you only have to provide the token's address and it will show up in your MetaMask. The following tokens and addresses are currently used in this DEX aggregator project:

```shell
WETH: 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2
USDC: 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
DAI: 0x6B175474E89094C44Da98b954EedeAC495271d0F
USDT: 0xdAC17F958D2ee523a2206206994597C13D831ec7
WBTC: 0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599
LINK: 0x514910771AF9Ca656af840dff83E8264EcF986CA
UNI: 0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984
AAVE: 0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9
```

These are real mainnet addresses, so they work on a mainnet fork automatically.

You can also find the token definitions in:

```shell
src/config/tokens.js
```

