require('dotenv').config();
const { ethers } = require('hardhat');

async function main() {
  console.log('Deploying SafeBaseSubscription contract to Base network...');

  // Get the contract factory
  const SafeBaseSubscription = await ethers.getContractFactory('SafeBaseSubscription');

  // Deploy the contract
  const subscription = await SafeBaseSubscription.deploy();
  await subscription.deployed();

  console.log('SafeBaseSubscription deployed to:', subscription.address);
  console.log('\nVerify contract on Basescan:');
  console.log('npx hardhat verify --network base', subscription.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });