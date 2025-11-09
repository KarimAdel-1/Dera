const { ethers } = require("hardhat");

// List of potential error signatures to check
const errorSignatures = [
  "StalePriceData(address,uint256)",
  "PriceNotAvailable(address)",
  "PriceTooOld(address,uint256)",
  "AssetInactive()",
  "AssetPaused()",
  "AssetFrozen()",
  "InvalidAmount()",
  "SupplyCapExceeded()",
  "BorrowCapExceeded()",
  "SupplyToSupplyToken()",
  "NegativePrice(address)",
  "PriceConfidenceTooLow(address,uint256,uint256)",
  "InvalidMintAmount()",
  "InvalidBurnAmount()",
  "NotEnoughAvailableUserBalance()",
  "WithdrawToSupplyToken()",
  "UnderlyingBalanceZero()",
  "LtvValidationFailed()",
  "HealthFactorLowerThanLiquidationThreshold()",
  "BorrowingNotEnabled()",
  "NoDebtOfSelectedType()",
  "CollateralCannotCoverNewBorrow()",
  "ZeroAddressNotValid()",
  "AssetNotListed()",
];

console.log("🔍 Finding Error Selector 0x358d9e8f\n");
console.log("============================================================");
console.log("COMPUTING ERROR SELECTORS");
console.log("============================================================\n");

const targetSelector = "0x358d9e8f";
let found = false;

for (const signature of errorSignatures) {
  const selector = ethers.id(signature).slice(0, 10);
  const match = selector === targetSelector ? "🎯 MATCH!" : "";

  if (match) {
    console.log(`✅ ${signature}`);
    console.log(`   Selector: ${selector} ${match}`);
    found = true;
  }
}

if (!found) {
  console.log("❌ None of the common errors match 0x358d9e8f");
  console.log("\nShowing all selectors for reference:");
  console.log("------------------------------------------------------------");

  for (const signature of errorSignatures) {
    const selector = ethers.id(signature).slice(0, 10);
    console.log(`${selector}  ${signature}`);
  }

  console.log("\n💡 The error 0x358d9e8f might be:");
  console.log("   1. A custom error we haven't checked yet");
  console.log("   2. An error with different parameter types");
  console.log("   3. An error from a library or dependency");
}

console.log("\n============================================================");
console.log("REVERSE ENGINEERING THE ERROR DATA");
console.log("============================================================\n");

console.log("Error data from transaction:");
console.log("  Selector: 0x358d9e8f");
console.log("  Data: 0x000000000000000000000000000000000000000000000000000000006910952e");
console.log("\nIf this is a single uint256 parameter:");
const value = BigInt("0x6910952e");
console.log("  Decimal:", value.toString());
console.log("  As timestamp:", new Date(Number(value) * 1000).toISOString());
console.log("  Current time:", new Date().toISOString());

const age = Math.floor(Date.now() / 1000) - Number(value);
console.log("  Age:", age, "seconds");

console.log("\n💡 This looks like a timestamp, suggesting the error is");
console.log("   related to stale data or time-based validation.");
