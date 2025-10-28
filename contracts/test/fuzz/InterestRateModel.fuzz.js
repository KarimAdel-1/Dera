const { expect } = require("chai");
const { ethers } = require("hardhat");

/**
 * Fuzz Tests for DeraInterestRateModel
 * Tests with randomized inputs to find edge cases
 */
describe("DeraInterestRateModel - Fuzz Tests", function () {
  let interestRateModel;
  let owner;

  before(async function () {
    [owner] = await ethers.getSigners();

    // Deploy interest rate model with typical parameters
    const DeraInterestRateModel = await ethers.getContractFactory(
      "contracts/hedera/DeraInterestRateModel.sol:DeraInterestRateModel"
    );

    const RAY = ethers.parseUnits("1", 27);
    const optimalUtilization = RAY * 8n / 10n; // 80%
    const baseRate = RAY * 2n / 100n; // 2%
    const slope1 = RAY * 4n / 100n; // 4%
    const slope2 = RAY * 60n / 100n; // 60%
    const assetFactor = 1000; // 10% in basis points

    interestRateModel = await DeraInterestRateModel.deploy(
      optimalUtilization,
      baseRate,
      slope1,
      slope2,
      assetFactor,
      owner.address
    );
  });

  describe("Random Utilization Rates", function () {
    it("Should handle 100 random utilization scenarios", async function () {
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        // Generate random utilization between 0% and 100%
        const utilizationPercent = Math.floor(Math.random() * 100);
        const utilization = ethers.parseUnits(utilizationPercent.toString(), 25); // As percentage of RAY

        // Generate random liquidity and debt that match this utilization
        const totalLiquidity = ethers.parseUnits(
          (Math.floor(Math.random() * 1000000) + 1).toString(),
          6
        );
        const totalDebt = (totalLiquidity * BigInt(utilizationPercent)) / 100n;
        const availableLiquidity = totalLiquidity - totalDebt;

        const params = {
          liquidityAdded: availableLiquidity,
          liquidityTaken: 0,
          totalDebt: totalDebt,
          assetFactor: 1000, // 10%
        };

        // Calculate rates
        const [liquidityRate, borrowRate] = await interestRateModel.calculateInterestRates(params);

        // Assertions
        expect(borrowRate).to.be.gte(0, `Iteration ${i}: Borrow rate should be non-negative`);
        expect(liquidityRate).to.be.gte(0, `Iteration ${i}: Liquidity rate should be non-negative`);
        expect(liquidityRate).to.be.lte(
          borrowRate,
          `Iteration ${i}: Liquidity rate should be <= borrow rate`
        );

        // Rates should be within reasonable bounds (0% to 500%)
        const maxRate = ethers.parseUnits("5", 27); // 500%
        expect(borrowRate).to.be.lte(maxRate, `Iteration ${i}: Borrow rate too high`);
        expect(liquidityRate).to.be.lte(maxRate, `Iteration ${i}: Liquidity rate too high`);
      }
    });
  });

  describe("Edge Cases - Extreme Values", function () {
    it("Should handle zero utilization", async function () {
      const params = {
        liquidityAdded: ethers.parseUnits("1000000", 6),
        liquidityTaken: 0,
        totalDebt: 0,
        assetFactor: 1000,
      };

      const [liquidityRate, borrowRate] = await interestRateModel.calculateInterestRates(params);

      expect(liquidityRate).to.equal(0, "Liquidity rate should be 0 at 0% utilization");
      expect(borrowRate).to.be.gt(0, "Borrow rate should be base rate at 0% utilization");
    });

    it("Should handle 100% utilization", async function () {
      const totalLiquidity = ethers.parseUnits("1000000", 6);

      const params = {
        liquidityAdded: 0,
        liquidityTaken: 0,
        totalDebt: totalLiquidity,
        assetFactor: 1000,
      };

      const [liquidityRate, borrowRate] = await interestRateModel.calculateInterestRates(params);

      expect(borrowRate).to.be.gt(0, "Borrow rate should be very high at 100% utilization");
      expect(liquidityRate).to.be.gt(0, "Liquidity rate should be high at 100% utilization");
    });

    it("Should handle very small liquidity amounts", async function () {
      const params = {
        liquidityAdded: 100, // 100 units (0.0001 USDC)
        liquidityTaken: 0,
        totalDebt: 50,
        assetFactor: 1000,
      };

      const [liquidityRate, borrowRate] = await interestRateModel.calculateInterestRates(params);

      expect(borrowRate).to.be.gte(0);
      expect(liquidityRate).to.be.gte(0);
    });

    it("Should handle very large liquidity amounts", async function () {
      const params = {
        liquidityAdded: ethers.parseUnits("1000000000", 6), // 1 billion USDC
        liquidityTaken: 0,
        totalDebt: ethers.parseUnits("500000000", 6), // 500 million borrowed
        assetFactor: 1000,
      };

      const [liquidityRate, borrowRate] = await interestRateModel.calculateInterestRates(params);

      expect(borrowRate).to.be.gte(0);
      expect(liquidityRate).to.be.gte(0);
      expect(liquidityRate).to.be.lte(borrowRate);
    });
  });

  describe("Mathematical Properties", function () {
    it("Liquidity rate should always be <= borrow rate", async function () {
      for (let util = 0; util <= 100; util += 5) {
        const totalLiquidity = ethers.parseUnits("1000000", 6);
        const totalDebt = (totalLiquidity * BigInt(util)) / 100n;
        const availableLiquidity = totalLiquidity - totalDebt;

        const params = {
          liquidityAdded: availableLiquidity,
          liquidityTaken: 0,
          totalDebt: totalDebt,
          assetFactor: 1000,
        };

        const [liquidityRate, borrowRate] = await interestRateModel.calculateInterestRates(params);

        expect(liquidityRate).to.be.lte(
          borrowRate,
          `At ${util}% utilization: liquidity rate should be <= borrow rate`
        );
      }
    });

    it("Borrow rate should increase with utilization", async function () {
      let previousBorrowRate = 0n;

      for (let util = 0; util <= 100; util += 10) {
        const totalLiquidity = ethers.parseUnits("1000000", 6);
        const totalDebt = (totalLiquidity * BigInt(util)) / 100n;
        const availableLiquidity = totalLiquidity - totalDebt;

        const params = {
          liquidityAdded: availableLiquidity,
          liquidityTaken: 0,
          totalDebt: totalDebt,
          assetFactor: 1000,
        };

        const [, borrowRate] = await interestRateModel.calculateInterestRates(params);

        if (util > 0) {
          expect(borrowRate).to.be.gte(
            previousBorrowRate,
            `Borrow rate should increase from ${util - 10}% to ${util}%`
          );
        }

        previousBorrowRate = borrowRate;
      }
    });

    it("Should handle rapid rate changes without overflow", async function () {
      // Simulate rapid changes in utilization
      const utilizationChanges = [0, 50, 100, 25, 75, 10, 90, 40, 60];

      for (const util of utilizationChanges) {
        const totalLiquidity = ethers.parseUnits("1000000", 6);
        const totalDebt = (totalLiquidity * BigInt(util)) / 100n;
        const availableLiquidity = totalLiquidity - totalDebt;

        const params = {
          liquidityAdded: availableLiquidity,
          liquidityTaken: 0,
          totalDebt: totalDebt,
          assetFactor: 1000,
        };

        // Should not revert
        await expect(interestRateModel.calculateInterestRates(params)).to.not.be.reverted;
      }
    });
  });

  describe("Randomized Stress Tests", function () {
    it("Should handle 1000 random scenarios without reverting", async function () {
      this.timeout(60000); // 60 seconds for stress test

      for (let i = 0; i < 1000; i++) {
        // Random liquidity between 1 and 10 billion USDC
        const totalLiquidity = ethers.parseUnits(
          Math.floor(Math.random() * 10000000000 + 1).toString(),
          6
        );

        // Random utilization 0-100%
        const utilPercent = Math.floor(Math.random() * 100);
        const totalDebt = (totalLiquidity * BigInt(utilPercent)) / 100n;
        const availableLiquidity = totalLiquidity - totalDebt;

        // Random asset factor 0-50%
        const assetFactor = Math.floor(Math.random() * 5000);

        const params = {
          liquidityAdded: availableLiquidity,
          liquidityTaken: 0,
          totalDebt: totalDebt,
          assetFactor: assetFactor,
        };

        // Should not revert
        const [liquidityRate, borrowRate] = await interestRateModel.calculateInterestRates(params);

        // Basic sanity checks
        expect(borrowRate).to.be.gte(0);
        expect(liquidityRate).to.be.gte(0);
        expect(liquidityRate).to.be.lte(borrowRate);
      }
    });
  });
});
