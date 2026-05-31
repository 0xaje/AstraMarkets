import "@nomicfoundation/hardhat-toolbox";

/** @type import('hardhat/config').HardhatUserConfig */
export default {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },
  networks: {
    somniaTestnet: {
      url: "https://dream-rpc.somnia.network",
      accounts: process.env.SOMNIA_PRIVATE_KEY ? [process.env.SOMNIA_PRIVATE_KEY] : []
    }
  }
};
