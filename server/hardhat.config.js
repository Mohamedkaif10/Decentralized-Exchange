// require("@nomicfoundation/hardhat-toolbox");
require("@nomiclabs/hardhat-ethers");
require("dotenv").config();
/** @type import('hardhat/config').HardhatUserConfig */
console.log("Key Length:", process.env.PRIVATE_KEY.length); 
module.exports = {
  solidity: "0.8.28",
  networks: {
    sepolia: {
      url: process.env.ALCHEMY_URL || "https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY",
      accounts: [process.env.PRIVATE_KEY], 
    },
  },
};