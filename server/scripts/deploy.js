const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with:", deployer.address);

  const tokenA = "0x514910771AF9Ca656af840dff83E8264EcF986CA"; 
  const tokenB = "0xdAC17F958D2ee523a2206206994597C13D831ec7"; 
  const rate = 2; 

  const SimpleDEX = await hre.ethers.getContractFactory("SimpleDEX");
  const dex = await SimpleDEX.deploy(tokenA, tokenB, rate);
  await dex.deployed();

  console.log("DEX deployed to:", dex.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});