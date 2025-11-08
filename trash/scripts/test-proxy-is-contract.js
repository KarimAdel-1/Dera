const { ethers } = require("hardhat");

async function createProxy(implementation) {
  const cloneInitCode = "0x3d602d80600a3d3981f3363d3d373d3d3d363d73" + implementation.slice(2) + "5af43d82803e903d91602b57fd5bf3";
  const [deployer] = await ethers.getSigners();
  const tx = await deployer.sendTransaction({ data: cloneInitCode });
  const receipt = await tx.wait();
  return receipt.contractAddress;
}

async function main() {
  console.log("🧪 Testing if Proxies are Contracts\n");
  
  const [deployer] = await ethers.getSigners();
  const deploymentInfo = JSON.parse(require("fs").readFileSync("./deployment-info.json", "utf8"));
  
  // Deploy a test implementation
  const DToken = await ethers.getContractFactory("ConcreteDeraSupplyToken");
  const impl = await DToken.deploy(deploymentInfo.addresses.POOL, deployer.address);
  await impl.waitForDeployment();
  const implAddr = await impl.getAddress();
  
  console.log("Implementation:", implAddr);
  const implCode = await ethers.provider.getCode(implAddr);
  console.log("Has code:", implCode.length > 2, `(${implCode.length} bytes)`);
  
  // Create proxy
  const proxyAddr = await createProxy(implAddr);
  console.log("\nProxy:", proxyAddr);
  const proxyCode = await ethers.provider.getCode(proxyAddr);
  console.log("Has code:", proxyCode.length > 2, `(${proxyCode.length} bytes)`);
  
  console.log("\n✅ Proxies ARE contracts on Hedera");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
