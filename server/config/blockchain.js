const { ethers } = require("ethers");
require("dotenv").config();


const provider = new ethers.providers.JsonRpcProvider(process.env.PROVIDER_URL);


const dexABI = [
  "function swapAtoB(uint256 amountA) external",
  "function swapBtoA(uint256 amountB) external",
  "function tokenA() view returns (address)",
  "function tokenB() view returns (address)",
];

const dexContract = new ethers.Contract(process.env.DEX_CONTRACT_ADDRESS, dexABI, provider);

module.exports = { provider, dexContract };