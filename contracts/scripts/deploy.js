import hre from "hardhat";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  const Registry = await hre.ethers.getContractFactory("PrivateAgentRegistry");
  const registry = await Registry.deploy(deployer.address);
  await registry.waitForDeployment();

  console.log("PrivateAgentRegistry deployed to:", await registry.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
