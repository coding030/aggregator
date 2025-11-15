require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.19",
  networks: {
    localhost: {},
    hardhat: {
      forking: {
        url: `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEYS}`,
        blockNumber: 23111456,
      },
    },
  },
  mocha: {
    timeout: 20000 // 200 seconds - forked tests can be slow
  }
};
