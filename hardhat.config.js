require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.9",
  networks: {
    localhost: {},
    hardhat: {
      forking: {
        url: "https://eth-mainnet.g.alchemy.com/v2/Ua4eFghdFAdInrxVmXQhAXG9fKPiIuvq",
        blockNumber: 23123456
      }
    },
  },
};
